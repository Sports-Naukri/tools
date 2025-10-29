type SiteFooterProps = {
  currentYear: number;
  isMenuOpen: boolean;
};

export function SiteFooter({ currentYear, isMenuOpen }: SiteFooterProps) {
  return (
    <footer
      className={`relative isolate flex-1 pt-16 transition-transform duration-300 ease-in-out transform-gpu border-t border-border/60 bg-background/80 py-8 backdrop-blur supports-backdrop-filter:bg-background/60 ${
        isMenuOpen
          ? "md:translate-x-0 translate-x-[80%] blur-sm"
          : "filter-none"
      }`}
      style={{ willChange: "transform" }}
    >
      <div className="container mx-auto px-4 text-center text-sm text-gray-600 sm:px-6 lg:px-8">
        © {currentYear} Sports Naukri. All Right Reserved.
      </div>
    </footer>
  );
}
