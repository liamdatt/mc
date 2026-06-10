import Link from "next/link";
import { MapPin, MessageSquare, UserRound } from "lucide-react";
import { Container } from "@/components/primitives/Container";
import { SHOWROOM_ADDRESS } from "@/lib/constants";

/**
 * Slim utility bar at the top of every product-related page: showroom
 * location, AI-assistant pointer, and portal sign-in, as three compact items
 * on one line (wrapping on small screens). Aligned to the same Container as
 * the page content below it.
 *
 * The site nav is `fixed` and transparent at the top of the page, so this
 * strip (always the first element on product pages) carries the clearance:
 * pt-24 puts its content below the nav while its background fills the band
 * behind the nav links.
 */
export function ShowroomBanner() {
  const item =
    "flex items-center gap-2 whitespace-nowrap text-[13px] text-mec-ink/75";
  const icon = "h-3.5 w-3.5 shrink-0 text-mec-red";
  return (
    <div className="w-full border-b border-black/10 bg-mec-mist pb-3 pt-24">
      <Container className="flex flex-wrap items-center gap-x-8 gap-y-1.5">
        <p className={item}>
          <MapPin className={icon} aria-hidden />
          <span>
            Visit our showroom —{" "}
            <strong className="font-semibold text-mec-ink">
              {SHOWROOM_ADDRESS}, Kingston
            </strong>
          </span>
        </p>
        <p className={item}>
          <MessageSquare className={icon} aria-hidden />
          <span>
            Product questions?{" "}
            <strong className="font-semibold text-mec-ink">
              Ask our AI assistant
            </strong>{" "}
            (bottom right)
          </span>
        </p>
        <p className={item}>
          <UserRound className={icon} aria-hidden />
          <span>
            Returning customer?{" "}
            <Link
              href="/portal"
              className="font-semibold text-mec-ink underline underline-offset-2 hover:text-mec-red"
            >
              Sign in to the Customer Portal
            </Link>
          </span>
        </p>
      </Container>
    </div>
  );
}
