import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { API_BASE_URL } from "../services/api";
import { bannerService } from "../services/bstoreService";
import { resolveMediaUrl } from "../utils/formatters";
import "./HeroSlider.css";

const HOME_BANNER_POSITIONS = [
  { key: "hero_main", slot: 1 },
  { key: "hero_right_top", slot: 2 },
  { key: "hero_right_bottom", slot: 3 },
];

const BANNER_SLOTS = HOME_BANNER_POSITIONS.map((position) => position.slot);
const POSITION_SLOT_MAP = HOME_BANNER_POSITIONS.reduce(
  (map, position) => ({ ...map, [position.key]: position.slot }),
  {},
);

const fallbackBanners = [
  {
    isFallback: true,
    slot: 1,
    subtitle: "BStore",
    title: "Ưu đãi đặc biệt",
    description: "Banner chính đang tải.",
    buttonText: "Xem sản phẩm",
    buttonLink: "/products",
    sortOrder: 0,
  },
  {
    isFallback: true,
    slot: 2,
    subtitle: "Hot deals",
    title: "Đang cập nhật banner",
    description: "Đang tải.",
    buttonText: "Xem deal",
    buttonLink: "/products?sort=flash",
    sortOrder: 0,
  },
  {
    isFallback: true,
    slot: 3,
    subtitle: "New arrivals",
    title: "Sản phẩm mới",
    description: "Đang tải.",
    buttonText: "Khám phá ngay",
    buttonLink: "/products?sort=new",
    sortOrder: 0,
  },
];

function hasHomeBannerKeys(value) {
  return (
    value &&
    typeof value === "object" &&
    HOME_BANNER_POSITIONS.some((position) =>
      Object.prototype.hasOwnProperty.call(value, position.key),
    )
  );
}

function unwrapHomeBannerPayload(payload = {}) {
  if (hasHomeBannerKeys(payload)) {
    return payload;
  }

  if (hasHomeBannerKeys(payload?.data)) {
    return payload.data;
  }

  if (hasHomeBannerKeys(payload?.banners)) {
    return payload.banners;
  }

  return payload;
}

function toBannerArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const collectionKeys = ["banners", "items", "content", "results", "data"];

  for (const key of collectionKeys) {
    if (Array.isArray(value[key])) {
      return value[key];
    }
  }

  return [value];
}

function getFallbackBanner(slot = 1) {
  return fallbackBanners.find((banner) => banner.slot === slot) || fallbackBanners[0];
}

function isActiveBanner(banner = {}) {
  const status = banner.status ?? banner.is_active ?? banner.active;

  if (status === undefined || status === null || status === "") {
    return true;
  }

  if (typeof status === "boolean") {
    return status;
  }

  if (typeof status === "number") {
    return status !== 0;
  }

  return !["0", "false", "inactive", "disabled", "hidden"].includes(
    String(status).trim().toLowerCase(),
  );
}

function getBannerSlot(banner = {}, index = 0) {
  const rawSlot =
    banner.display_slot ??
    banner.displaySlot ??
    banner.banner_slot ??
    banner.bannerSlot ??
    banner.home_slot ??
    banner.homeSlot ??
    banner.frame_position ??
    banner.framePosition ??
    banner.position ??
    banner.slot;
  const namedSlot =
    typeof rawSlot === "string" ? POSITION_SLOT_MAP[rawSlot.trim().toLowerCase()] : null;
  const slot = namedSlot || Number(rawSlot);

  if (BANNER_SLOTS.includes(slot)) {
    return slot;
  }

  return (index % BANNER_SLOTS.length) + 1;
}

function getApiOrigin() {
  return API_BASE_URL.replace(/\/api\/?$/i, "").replace(/\/+$/, "");
}

function isAbsoluteMediaUrl(value) {
  return /^(https?:)?\/\//i.test(value) || value.startsWith("data:") || value.startsWith("blob:");
}

function resolveBannerImage(value = "") {
  if (!value || typeof value !== "string") {
    return "";
  }

  const image = value.trim();

  if (!image) {
    return "";
  }

  if (isAbsoluteMediaUrl(image)) {
    return image;
  }

  if (image.startsWith("/")) {
    return `${getApiOrigin()}${image}`;
  }

  if (/^(uploads|storage)\//i.test(image)) {
    return `${getApiOrigin()}/${image}`;
  }

  return resolveMediaUrl(image);
}

function getBannerImageValue(banner = {}) {
  return (
    banner.full_image_url ||
    banner.fullImageUrl ||
    banner.fullImageURL ||
    banner.image_url ||
    banner.imageUrl ||
    banner.banner_image ||
    banner.bannerImage ||
    banner.desktop_image_url ||
    banner.desktopImageUrl ||
    banner.mobile_image_url ||
    banner.mobileImageUrl ||
    banner.image ||
    banner.thumbnail ||
    banner.cover ||
    ""
  );
}

function getBannerLink(banner = {}, fallback = {}) {
  return (
    banner.link ||
    banner.link_url ||
    banner.linkUrl ||
    banner.redirect_url ||
    banner.redirectUrl ||
    banner.target_url ||
    banner.targetUrl ||
    banner.buttonLink ||
    banner.button_link ||
    banner.route ||
    banner.href ||
    banner.url ||
    (banner.isFallback ? fallback.buttonLink : "") ||
    ""
  );
}

function normalizeBanner(banner = {}, index = 0, slot = getBannerSlot(banner, index), isFullImage = false) {
  const fallback = getFallbackBanner(slot);
  const image = resolveBannerImage(getBannerImageValue(banner));
  const title = banner.title || banner.name || fallback.title;

  return {
    id: banner.id ?? banner.banner_id ?? `${slot}-${title}-${index}`,
    slot,
    subtitle: banner.subtitle || banner.sub_title || (banner.isFallback ? fallback.subtitle : ""),
    title,
    description:
      banner.description ||
      banner.content ||
      banner.short_description ||
      (banner.isFallback ? fallback.description : ""),
    buttonText:
      banner.buttonText ||
      banner.button_text ||
      banner.cta_text ||
      (banner.isFallback ? fallback.buttonText : ""),
    buttonLink: getBannerLink(banner, fallback),
    image,
    sortOrder: Number(banner.sort_order ?? banner.sortOrder ?? fallback.sortOrder ?? index),
    isFullImage,
  };
}

function normalizeHomeBanners(payload = {}) {
  const source = unwrapHomeBannerPayload(payload);

  if (hasHomeBannerKeys(source)) {
    return HOME_BANNER_POSITIONS.flatMap(({ key, slot }) =>
      toBannerArray(source[key])
        .filter(isActiveBanner)
        .map((banner, index) => normalizeBanner(banner, index, slot, true))
        .filter((banner) => banner.image),
    );
  }

  return toBannerArray(source)
    .filter(isActiveBanner)
    .map((banner, index) => normalizeBanner(banner, index, getBannerSlot(banner, index), true))
    .filter((banner) => banner.image);
}

function isExternalLink(value = "") {
  return /^(https?:)?\/\//i.test(value);
}

function BannerLink({ banner, children }) {
  if (!banner.buttonLink) {
    return <div className="hero-banner-link">{children}</div>;
  }

  if (isExternalLink(banner.buttonLink)) {
    return (
      <a className="hero-banner-link" href={banner.buttonLink}>
        {children}
      </a>
    );
  }

  return (
    <Link className="hero-banner-link" to={banner.buttonLink}>
      {children}
    </Link>
  );
}

function BannerSlide({ banner, compact }) {
  const [imageFailed, setImageFailed] = useState(false);

  const fallback = getFallbackBanner(banner.slot);
  const displayBanner = imageFailed
    ? {
        ...banner,
        subtitle: banner.subtitle || fallback.subtitle,
        description: banner.description || fallback.description,
        buttonText: banner.buttonText || fallback.buttonText,
        image: "",
        isFullImage: false,
      }
    : banner;

  if (displayBanner.isFullImage) {
    return (
      <BannerLink banner={displayBanner}>
        <img
          className="hero-banner-image"
          alt={displayBanner.title}
          onError={() => setImageFailed(true)}
          src={displayBanner.image}
        />
      </BannerLink>
    );
  }

  const className = [
    "hero-designed-banner",
    compact ? "compact" : "",
    displayBanner.image ? "" : "hero-designed-banner--text-only",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <BannerLink banner={displayBanner}>
      <div className={className}>
        <div className="hero-content">
          {displayBanner.subtitle ? (
            <span className="hero-subtitle">{displayBanner.subtitle}</span>
          ) : null}
          <h1 className="hero-title">{displayBanner.title}</h1>
          {displayBanner.description ? (
            <p className="hero-description">{displayBanner.description}</p>
          ) : null}
          {displayBanner.buttonText ? (
            <span className="hero-cta">{displayBanner.buttonText}</span>
          ) : null}
        </div>
        {displayBanner.image ? (
          <div className="hero-image">
            <img alt="" onError={() => setImageFailed(true)} src={displayBanner.image} />
          </div>
        ) : null}
      </div>
    </BannerLink>
  );
}

function BannerSlotSlider({ banners, compact = false, slot }) {
  if (!banners.length) {
    return null;
  }

  const hasMultipleSlides = banners.length > 1;

  return (
    <section
      className={compact ? "hero-slot hero-slot--secondary" : "hero-slot hero-slot--primary"}
      aria-label={`Banner ${slot}`}
    >
      <Swiper
        autoplay={
          hasMultipleSlides
            ? {
                delay: compact ? 3600 + slot * 250 : 3000,
                disableOnInteraction: false,
              }
            : false
        }
        loop={hasMultipleSlides}
        modules={[Navigation, Pagination, Autoplay]}
        navigation={!compact && hasMultipleSlides}
        pagination={hasMultipleSlides ? { clickable: true } : false}
        slidesPerView={1}
      >
        {banners.map((banner, index) => (
          <SwiperSlide key={banner.id || `${banner.title}-${index}`}>
            <BannerSlide banner={banner} compact={compact} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}

export default function HeroSlider() {
  const [databaseBanners, setDatabaseBanners] = useState(null);
  const fallbackSlides = useMemo(
    () => fallbackBanners.map((banner, index) => normalizeBanner(banner, index, banner.slot)),
    [],
  );
  const hasLoadedBanners = Array.isArray(databaseBanners);
  const hasDatabaseBanners = hasLoadedBanners && databaseBanners.length > 0;
  const banners = hasLoadedBanners
    ? hasDatabaseBanners
      ? databaseBanners
      : fallbackSlides
    : fallbackSlides;

  const bannersBySlot = useMemo(
    () =>
      BANNER_SLOTS.reduce((groups, slot) => {
        const slotBanners = banners
          .filter((banner) => banner.slot === slot)
          .sort((left, right) => left.sortOrder - right.sortOrder);
        const fallbackSlotBanners = fallbackSlides.filter((banner) => banner.slot === slot);

        groups[slot] = slotBanners.length ? slotBanners : fallbackSlotBanners;
        return groups;
      }, {}),
    [banners, fallbackSlides],
  );

  useEffect(() => {
    let mounted = true;

    async function loadBanners() {
      try {
        const payload = await bannerService.getHomeBanners();
        const list = normalizeHomeBanners(payload).sort(
          (left, right) => left.slot - right.slot || left.sortOrder - right.sortOrder,
        );

        if (mounted) {
          setDatabaseBanners(list);
        }
      } catch {
        if (mounted) {
          setDatabaseBanners([]);
        }
      }
    }

    loadBanners();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="hero-slider" aria-label="BStore featured banners">
      <div className="hero-showcase-grid">
        <BannerSlotSlider banners={bannersBySlot[1] || []} slot={1} />
        <div className="hero-side-stack">
          <BannerSlotSlider banners={bannersBySlot[2] || []} compact slot={2} />
          <BannerSlotSlider banners={bannersBySlot[3] || []} compact slot={3} />
        </div>
      </div>
    </section>
  );
}
