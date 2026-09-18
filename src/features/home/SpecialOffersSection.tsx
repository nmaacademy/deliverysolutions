import { useMemo } from 'react';
import { motion } from 'motion/react';
import { MenuItem } from '../../types';
import { revealOnView, riseItem, staggerGroup } from '../../lib/motion';
import { triggerVibration } from '../../lib/haptics';
import { FadeInImage } from '../../components/ui/FadeInImage';
import { specialOffers } from '../../data/home';
import SectionHeader from './SectionHeader';

interface Props {
  menuItems: MenuItem[];
  onSelectItem: (item: MenuItem) => void;
}

/**
 * The photo dissolves into the card instead of ending on an edge. A straight linear ramp reads as a
 * hard cut halfway through, so the stops ease off: opaque for the first fifth, then most of the
 * alpha is spent over the middle of the card and the last of it trails away to nothing.
 *
 * Written out in full, both properties: Tailwind scans the source as text, so a class assembled from
 * a template literal at runtime is never generated.
 */
const PHOTO_FADE =
  '[mask-image:linear-gradient(to_right,#000_0%,#000_16%,rgba(0,0,0,0.95)_26%,rgba(0,0,0,0.8)_36%,rgba(0,0,0,0.58)_46%,rgba(0,0,0,0.36)_55%,rgba(0,0,0,0.18)_64%,rgba(0,0,0,0.07)_72%,rgba(0,0,0,0.02)_79%,transparent_86%)] [-webkit-mask-image:linear-gradient(to_right,#000_0%,#000_16%,rgba(0,0,0,0.95)_26%,rgba(0,0,0,0.8)_36%,rgba(0,0,0,0.58)_46%,rgba(0,0,0,0.36)_55%,rgba(0,0,0,0.18)_64%,rgba(0,0,0,0.07)_72%,rgba(0,0,0,0.02)_79%,transparent_86%)]';

/**
 * The dissolve also goes soft: the blur fades in where the photo starts thinning out and then simply
 * stays on to the card's own edge. A masked backdrop filter that stops mid-card leaves a hard
 * vertical seam where the filtering ends, so this layer is never narrower than the card.
 */
const BLUR_FADE =
  '[mask-image:linear-gradient(to_right,transparent_0%,transparent_16%,rgba(0,0,0,0.3)_28%,rgba(0,0,0,0.7)_42%,rgba(0,0,0,0.95)_54%,#000_62%,#000_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0%,transparent_16%,rgba(0,0,0,0.3)_28%,rgba(0,0,0,0.7)_42%,rgba(0,0,0,0.95)_54%,#000_62%,#000_100%)]';

/**
 * Navy poured over the tail of the photo on the same long ramp, so nothing steps. It reaches solid
 * well before the text starts, so the headline and the price always sit on flat colour.
 */
const SCRIM =
  'bg-[linear-gradient(to_right,rgba(11,18,32,0)_0%,rgba(11,18,32,0.1)_18%,rgba(11,18,32,0.3)_32%,rgba(11,18,32,0.56)_44%,rgba(11,18,32,0.78)_55%,rgba(11,18,32,0.93)_64%,#0B1220_74%)]';

/** Big figures on the left of the comma, the bani small and raised, the way a price is set in print. */
function price(value: number) {
  const [lei, bani] = value.toFixed(2).split('.');
  return { lei, bani };
}

/**
 * The last section of the Home page: three wide advert cards on deep navy, the dish bleeding out of
 * the left edge and the price set large on the right. Tapping one opens the product page, so the
 * price on the advert is the product's own — nothing here discounts anything.
 */
export default function SpecialOffersSection({ menuItems, onSelectItem }: Props) {
  const offers = useMemo(() => specialOffers(menuItems), [menuItems]);

  if (offers.length === 0) return null;

  return (
    <section aria-labelledby="home-offers">
      <SectionHeader id="home-offers" title="Oferte speciale" hint="Recomandările chefului" />

      <motion.ul variants={staggerGroup(0.05, 0)} {...revealOnView} className="flex flex-col gap-3 sm:gap-4">
        {offers.map(offer => {
          const { lei, bani } = price(offer.item.price);
          return (
            <motion.li key={offer.id} variants={riseItem}>
              <motion.button
                type="button"
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  triggerVibration(10);
                  onSelectItem(offer.item);
                }}
                className="group relative isolate block w-full h-[152px] sm:h-[172px] lg:h-[188px] overflow-hidden rounded-card text-left ring-1 ring-white/10 shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition-shadow hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4EAE6] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
              >
                {/* The night-blue ground of the advert, lit from behind the price. */}
                <span
                  aria-hidden
                  className="absolute inset-0 -z-30 bg-[#0B1220] bg-[radial-gradient(130%_150%_at_92%_50%,#16223A_0%,#0D1526_52%,#080D18_100%)]"
                />

                {/* The photo carries its own absolute wrapper: FadeInImage sets `relative` on the
                    element it is given, and Tailwind emits `.relative` after `.absolute`, so a
                    position passed in through its className would lose and drop it into the flow. */}
                <span aria-hidden className={`absolute inset-0 -z-20 ${PHOTO_FADE}`}>
                  <FadeInImage
                    src={offer.item.image}
                    alt=""
                    className="w-full h-full"
                    imageClassName="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                  />
                </span>

                {/* Softens the photo through the dissolve, so it melts into the navy rather than
                    thinning out while still sharp. */}
                <span aria-hidden className={`absolute inset-0 -z-10 backdrop-blur-[3px] ${BLUR_FADE}`} />

                {/* Keeps the text on an even ground whatever the photo is, without darkening the dish. */}
                <span aria-hidden className={`absolute inset-0 -z-10 ${SCRIM}`} />

                {/* Text sits on the dark half, clear of the photo at every width. The kicker, the
                    headline and the description range left; only the price is pushed to the card's
                    inner edge, the way a price is set on a printed advert. */}
                <span className="relative flex h-full w-[48%] sm:w-[46%] lg:w-[44%] ml-auto flex-col justify-center gap-1 pr-4 sm:pr-6 py-3">
                  <span className="inline-flex self-start items-center rounded-full bg-[#D4EAE6]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#D4EAE6]">
                    {offer.kicker}
                  </span>

                  <span className="block text-[17px] sm:text-[22px] lg:text-[26px] font-sans font-bold tracking-tight text-white leading-[1.2] text-balance drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
                    {offer.title}
                  </span>

                  <span className="block text-[11.5px] sm:text-[13px] text-zinc-400 leading-[1.4]">
                    {offer.description}
                  </span>

                  {/* Wraps rather than being clipped by the card: at 320px a three-digit price, the
                      label and the currency only just fit on one line. */}
                  <span className="mt-1 flex flex-wrap items-baseline justify-end gap-x-1">
                    <span className="text-[9px] sm:text-[11px] font-medium uppercase tracking-[0.12em] sm:tracking-[0.18em] text-zinc-400">doar</span>
                    <span className="text-[22px] sm:text-[30px] lg:text-[34px] font-bold tracking-tight text-white tabular-nums leading-none">
                      {lei}
                      <span className="align-super text-[0.42em] font-bold">,{bani}</span>
                    </span>
                    <span className="text-[11px] sm:text-[12px] font-semibold text-[#D4EAE6]">RON</span>
                  </span>
                </span>
              </motion.button>
            </motion.li>
          );
        })}
      </motion.ul>
    </section>
  );
}
