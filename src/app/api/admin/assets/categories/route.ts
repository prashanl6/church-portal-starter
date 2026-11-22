import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireRole, guardAdmin } from '@/lib/auth';

// Default categories
// Where an item belongs or what kind it is (requirement: label category such as Chapel or Hall).
const DEFAULT_CATEGORIES = ['Chapel', 'Main Hall', 'Furniture', 'Sound Equipment', 'AV Equipment', 'Cutlery and Dishware', 'Medical Equipment'];

export async function GET() {
  const u = await requireRole(['admin', 'staff']);
  if (!u) {
    return NextResponse.json({ error: 'Please log in to continue' }, { status: 401 });
  }

  try {
    // Get unique categories from existing assets
    const existingCategories = await prisma.asset.findMany({
      select: { labelCategory: true },
      distinct: ['labelCategory']
    });
    
    const categorySet = new Set(DEFAULT_CATEGORIES);
    existingCategories.forEach(a => categorySet.add(a.labelCategory));
    
    const categories = Array.from(categorySet).sort();
    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Error in GET /api/admin/assets/categories:', error);
    return NextResponse.json({ categories: DEFAULT_CATEGORIES }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const g = await guardAdmin();
  if ('response' in g) return g.response;

  try {
    const body = await req.json();
    const { categories } = body;
    
    if (!Array.isArray(categories)) {
      return NextResponse.json({ error: 'Categories must be an array' }, { status: 400 });
    }

    // For now, we'll just validate - categories are stored implicitly through asset creation
    // In a production system, you might want a separate Category table
    return NextResponse.json({ ok: true, message: 'Categories will be available as assets are created' });
  } catch (error: any) {
    console.error('Error in POST /api/admin/assets/categories:', error);
    return NextResponse.json({ error: 'Failed to update categories' }, { status: 500 });
  }
}


export const dynamic = 'force-dynamic';
