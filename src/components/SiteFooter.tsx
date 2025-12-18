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
      className={`border-t border-gray-100 bg-white py-6 transition-all duration-300 ${
        isMenuOpen ? "blur-sm md:blur-none md:ml-80" : "md:ml-0"
      }`}
    >
      <div className="container mx-auto px-4 text-center text-sm text-gray-500">
        <p>© {currentYear} Sports Naukri. All rights reserved.</p>
      </div>
    </footer>
  );
}
