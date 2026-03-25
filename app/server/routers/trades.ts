import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '@/db/drizzle';
import { trades, tradeLotMatches } from '@/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

// It's safer to just use standard float arithmetic and Number() for v1, or Big() if installed.
// We'll use Number for simplicity but caution floating points for exact accounting.

import { ilike, SQL, count } from 'drizzle-orm';

export const tradesRouter = router({
  list: protectedProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(40),
      action: z.string().default("all"),
      symbolId: z.string().optional(),
      search: z.string().optional(),
    }).optional().default({}))
    .query(async ({ ctx, input }) => {
      const { page, limit, action, symbolId, search } = input;
      const conditions: SQL[] = [eq(trades.userId, ctx.session.user.id)];
      
      if (action && action !== "all") {
        conditions.push(eq(trades.tradeType, action as "buy" | "sell"));
      }
      if (symbolId && symbolId !== "all") {
        conditions.push(eq(trades.symbolId, symbolId));
      }
      if (search) {
        conditions.push(ilike(trades.notes, `%${search}%`));
      }

      const whereClause = and(...conditions);

      const items = await db.query.trades.findMany({
        where: whereClause,
        orderBy: [desc(trades.tradeDate), desc(trades.createdAt)],
        limit,
        offset: (page - 1) * limit,
        with: {
          platform: true,
          symbol: true,
          bucket: true,
        }
      });

      const totalCountRes = await db.select({ value: count() }).from(trades).where(whereClause);
      const totalCount = totalCountRes[0].value;
      
      return {
        items,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        page,
      };
    }),
  getOpenQuantity: protectedProcedure
    .input(z.object({
      platformId: z.string(),
      symbolId: z.string()
    }))
    .query(async ({ ctx, input }) => {
      const { platformId, symbolId } = input;
      const userId = ctx.session.user.id;

      const buys = await db.query.trades.findMany({
        where: and(
          eq(trades.userId, userId),
          eq(trades.platformId, platformId),
          eq(trades.symbolId, symbolId),
          eq(trades.tradeType, 'buy')
        )
      });

      if (buys.length === 0) return 0;

      const buyIds = buys.map(b => b.id);
      const allMatches = await db.query.tradeLotMatches.findMany({
        where: eq(tradeLotMatches.userId, userId)
      });
      
      const scopeMatches = allMatches.filter(m => buyIds.includes(m.buyTradeId));

      let totalOpen = 0;
      for (const buy of buys) {
        const buyQty = Number(buy.quantity);
        const matchesForBuy = scopeMatches.filter(m => m.buyTradeId === buy.id);
        const matchedSoFar = matchesForBuy.reduce((sum, m) => sum + Number(m.matchedQuantity), 0);
        totalOpen += (buyQty - matchedSoFar);
      }
      
      return totalOpen;
    }),
  create: protectedProcedure
    .input(z.object({
      platformId: z.string(),
      symbolId: z.string(),
      bucketId: z.string(),
      tradeType: z.enum(['buy', 'sell']),
      tradeDate: z.string(), // YYYY-MM-DD
      quantity: z.string(), // decimal string
      price: z.string(),
      fee: z.string().default('0'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { platformId, symbolId, bucketId, tradeType, tradeDate, quantity, price, fee, notes } = input;
      const userId = ctx.session.user.id;

      return await db.transaction(async (tx) => {
        // 1. Insert the trade
        const [trade] = await tx.insert(trades).values({
          userId,
          platformId,
          symbolId,
          bucketId,
          tradeType,
          tradeDate: tradeDate,
          quantity,
          price,
          fee,
          notes,
        }).returning();

        // 2. If Buy, we are done. If Sell, we must match FIFO.
        if (tradeType === 'sell') {
          let sellQtyRemaining = Number(quantity);
          const sellPrice = Number(price);
          const sellFee = Number(fee);

          // Get all buys for this scope
          const buys = await tx.query.trades.findMany({
            where: and(
              eq(trades.userId, userId),
              eq(trades.platformId, platformId),
              eq(trades.symbolId, symbolId),
              eq(trades.bucketId, bucketId),
              eq(trades.tradeType, 'buy')
            ),
            orderBy: [asc(trades.tradeDate), asc(trades.createdAt)],
          });

          // Get all existing matches for these buys to find remaining open qty
          const buyIds = buys.map(b => b.id);
          let allMatches: any[] = [];
          if (buyIds.length > 0) {
            allMatches = await tx.query.tradeLotMatches.findMany({
              where: and(
                eq(tradeLotMatches.userId, userId)
              ) // We specifically need to filter by buyIds, but drizzle 'inArray' is better. For now we will just filter in memory or fetch all for user.
            });
          }
          
          const scopeMatches = allMatches.filter(m => buyIds.includes(m.buyTradeId));

          for (const buy of buys) {
            if (sellQtyRemaining <= 0.000001) break; // floating point safe zero check

            const buyQty = Number(buy.quantity);
            const matchesForBuy = scopeMatches.filter(m => m.buyTradeId === buy.id);
            const matchedSoFar = matchesForBuy.reduce((sum, m) => sum + Number(m.matchedQuantity), 0);
            const openQty = buyQty - matchedSoFar;

            if (openQty > 0.000001) {
              const matchedQty = Math.min(openQty, sellQtyRemaining);
              const buyPrice = Number(buy.price);
              
              const matchedCost = matchedQty * buyPrice;
              const matchedProceeds = matchedQty * sellPrice;
              
              // We distribute the sell fee proportionally to the matched chunks.
              const feeProportion = matchedQty / Number(quantity);
              const allocatedFee = sellFee * feeProportion;
              
              const realizedPnl = matchedProceeds - matchedCost - allocatedFee;

              await tx.insert(tradeLotMatches).values({
                userId,
                sellTradeId: trade.id,
                buyTradeId: buy.id,
                matchedQuantity: matchedQty.toString(),
                buyPrice: buyPrice.toString(),
                sellPrice: sellPrice.toString(),
                matchedCost: matchedCost.toString(),
                matchedProceeds: matchedProceeds.toString(),
                realizedPnl: realizedPnl.toString(),
              });

              sellQtyRemaining -= matchedQty;
            }
          }

          if (sellQtyRemaining > 0.000001) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Insufficient open quantity to sell. Short by ${sellQtyRemaining}`,
            });
          }
        }

        return trade;
      });
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      platformId: z.string(),
      symbolId: z.string(),
      bucketId: z.string(),
      tradeType: z.enum(['buy', 'sell']),
      tradeDate: z.string(),
      quantity: z.string(),
      price: z.string(),
      fee: z.string().default('0'),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, platformId, symbolId, bucketId, tradeType, tradeDate, quantity, price, fee, notes } = input;
      const userId = ctx.session.user.id;

      await db.update(trades)
        .set({
          platformId,
          symbolId,
          bucketId,
          tradeDate,
          tradeType,
          quantity,
          price,
          fee,
          notes
        })
        .where(and(eq(trades.id, id), eq(trades.userId, userId)));
      
      return { success: true };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Deleting a cascade will delete tradeLotMatches, but if we delete a buy that was sold against,
      // the sell becomes unbalanced. For strict accounting, we should throw if deleting a matched buy.
      // But for v1 let's just delete and require manual re-entry.
      await db.delete(trades).where(and(eq(trades.id, input.id), eq(trades.userId, ctx.session.user.id)));
      return true;
    }),
});
