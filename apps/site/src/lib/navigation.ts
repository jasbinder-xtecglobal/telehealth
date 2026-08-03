import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { CONSOLE_URL } from "./trpc.ts";

/**
 * Page names → URLs.
 *
 * The Figma export navigated by passing a page name into `setPage`. That name
 * is kept as the public API of every page component so they did not need
 * rewriting, but it now resolves to a real route: the address bar is correct,
 * the back button works, and a booking link can be shared.
 */
export const PAGE_ROUTES: Record<string, string> = {
  home: "/",
  book: "/book",
  submitted: "/request-submitted",
  doctors: "/our-doctors",
  jobs: "/doctor-jobs",
  faq: "/faq",
  contact: "/contact",
};

/** Reverse lookup for the nav's active-link highlight. */
export function pageForPath(pathname: string): string {
  const hit = Object.entries(PAGE_ROUTES).find(([, path]) => path === pathname);
  return hit?.[0] ?? "home";
}

export function usePageName(): string {
  return pageForPath(useLocation().pathname);
}

export type SetPage = (page: string) => void;

/**
 * Navigates by page name.
 *
 * Two names are not routes on this site:
 *   `login` leaves for the clinician console, which owns authentication. A
 *   second sign-in form here would be one more thing to keep in step with the
 *   session, lockout and verification rules the API already enforces.
 *
 *   `how-it-works` is a section of the home page, not a page.
 */
export function useSetPage(): SetPage {
  const navigate = useNavigate();

  return useCallback(
    (page: string) => {
      if (page === "login") {
        window.location.href = `${CONSOLE_URL}/login`;
        return;
      }

      if (page === "how-it-works") {
        navigate("/");
        // After the route commits, so the section exists to scroll to.
        requestAnimationFrame(() =>
          document
            .getElementById("how-it-works")
            ?.scrollIntoView({ behavior: "smooth" }),
        );
        return;
      }

      navigate(PAGE_ROUTES[page] ?? "/");
    },
    [navigate],
  );
}
