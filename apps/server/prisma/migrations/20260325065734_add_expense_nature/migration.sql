-- CreateEnum
CREATE TYPE "ExpenseNature" AS ENUM ('essential', 'optional', 'one_off');

-- AlterTable
ALTER TABLE "LedgerEntry" ADD COLUMN     "expenseNature" "ExpenseNature";
