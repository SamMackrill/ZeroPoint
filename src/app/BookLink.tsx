import { BookOpen } from 'lucide-react';

/** The book companion, relative to the laboratory page: an interactive diagram for every figure of Fleming's book. */
export const BOOK_COMPANION = './book/';

/** The header's link to the book companion, styled like the repository link beside it. */
export function BookLink() {
  return <a className="repository-link book-link" href={BOOK_COMPANION} data-testid="book-link" aria-label="Read the book: an interactive diagram for every figure" title="The Zero-Point Universe, figure by figure"><BookOpen size={17} aria-hidden="true"/><span className="repository-label">Read the book</span></a>;
}
