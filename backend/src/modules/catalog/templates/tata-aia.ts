import { names, type CatalogTemplate } from "./types.js";

/**
 * TATA AIA Life Insurance: the Life line, grouped the way the insurer's portal groups it.
 * Product names are listed as shown there (without the "TATA AIA" brand prefix).
 */
export const tataAiaTemplate: CatalogTemplate = [
  {
    line: "LIFE",
    categories: [
      {
        name: "Health Solutions",
        policies: names("Sampoorna Care - Cancer Fund", "Sampoorna Care", "Pro-Fit"),
      },
      {
        name: "Savings Solutions",
        policies: names(
          "Life Insurance Fortune Guarantee Plus",
          "Life Insurance Fortune Guarantee Plus POS",
          "Life Insurance Smart Income Plus",
          "Life Insurance Guaranteed Return Insurance Plan",
          "Life Insurance Guaranteed Return Insurance Plan POS",
          "Fortune Guarantee Supreme",
          "Life Insurance Smart Value Income Plan",
          "Fortune Guarantee Secure",
          "Fortune Guarantee Secure POS",
          "Life Insurance Diamond Savings Plan",
          "Life Insurance Diamond Savings Plan Plus",
          "Life Insurance Fortune Guarantee",
          "Life Insurance Value Income Plan",
          "Shubh Flexi Income Plan",
        ),
      },
      {
        name: "Protection Solutions",
        policies: names(
          "Sampoorna Raksha Promise",
          "Sampoorna Raksha Promise POS",
          "Shubh Family Protect",
          "Shubh Rakshak",
          "Shubh Shakti",
          "Maha Raksha Supreme Select",
          "Shubh Shakti Select",
          "Shubh Rakshak Select",
          "Life Insurance Saral Jeevan Bima",
        ),
      },
      {
        name: "Retirement Solutions",
        policies: names(
          "Shubh Flexi Pension Plan",
          "Life Insurance Fortune Guarantee Pension",
          "Life Insurance Saral Pension",
          "Life Insurance Smart Annuity Plan",
          "TATA Fortune Guarantee Retirement Ready",
          "Premier Pension Secure",
        ),
      },
      {
        name: "Shubh Solutions",
        policies: names(
          "Life Shubh Solution",
          "Shubh Health Pro",
          "Shubh Health Criti",
          "Shubh Maha Life",
          "Shubh Maha Flexi",
        ),
      },
      {
        name: "Wealth Solutions",
        policies: names(
          "New Param Raksha",
          "Param Raksha",
          "Smart SIP",
          "Smart Fortune Plus",
          "Life Insurance Wealth Pro",
          "Life Insurance Fortune Pro",
          "Life Insurance Fortune Maxima",
          "Life Insurance Wealth Maxima",
          "Premier SIP",
          "Life Insurance Smart Sampoorna Raksha Plus",
        ),
      },
    ],
  },
];
