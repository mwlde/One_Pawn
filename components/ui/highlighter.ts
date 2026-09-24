// The marker stroke: a pink band over the lower part of the letters, as if drawn
// with a highlighter. Pink is the user's own marks, so it is used for "where you
// are" in the nav and for the key phrase of the product line, and nowhere as a
// full-height block. The band's stops are percentages of the element's box, so
// a block-level element needs line-height close to 1 for it to overlap the text.
export const HIGHLIGHTER =
  "bg-[linear-gradient(transparent_58%,var(--highlight)_58%,var(--highlight)_92%,transparent_92%)] px-0.5";
