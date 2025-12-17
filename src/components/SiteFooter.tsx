/**
 * Site Footer Component
 *
 * Simple footer with copyright information.
 * Adapts to the mobile menu state (slides out/blurs).
 *
 * @module components/SiteFooter
 */

type SiteFooterProps = {
  currentYear: number;
  isMenuOpen: boolean;
};

export function SiteFooter({ currentYear, isMenuOpen }: SiteFooterProps) {
  return (
    <footer
      className={`relative isolate flex-1 pt-16 transform-gpu transition-transform duration-300 ease-in-out md:transition-[margin,transform,filter] border-t border-border/60 bg-background/80 py-8 backdrop-blur supports-backdrop-filter:bg-background/60 ${
        isMenuOpen
          ? "translate-x-[80%] blur-sm md:translate-x-0 md:blur-none md:filter-none md:ml-80"
          : "translate-x-0 md:ml-0 filter-none"
      }`}
    >
      <div className="container mx-auto px-4 text-center text-sm text-gray-600 sm:px-6 lg:px-8">
        © {currentYear} Sports Naukri. All Right Reserved.
      </div>
    </footer>
  );
}
