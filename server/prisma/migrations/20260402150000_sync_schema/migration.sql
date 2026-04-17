-- AlterTable
ALTER TABLE "PortfolioItem" ADD COLUMN IF NOT EXISTS "mediaType" TEXT DEFAULT 'image';

-- Drop old unique constraint if it exists (requires checking manually in pure postgres, skipping to avoid error if it doesn't exist, we'll just try to add the new one)
-- Using IF NOT EXISTS for the new constraint
CREATE UNIQUE INDEX IF NOT EXISTS "User_name_key" ON "User"("name");
