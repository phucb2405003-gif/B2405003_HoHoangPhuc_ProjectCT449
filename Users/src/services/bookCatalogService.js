import books from '@/data/books'

// Keep Home, the catalog page, and details on the same temporary local dataset.
export async function getBookCatalog() {
  return books
}
