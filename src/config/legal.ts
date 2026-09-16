import { siteConfig } from './site';

/**
 * Policy content.
 *
 * Kept in one file rather than a CMS: these change a few times a year, they
 * need to be reviewable in a pull request, and they must never be editable
 * without that review.
 *
 * The shipping and returns text is operational and correct. The privacy and
 * terms pages are a working baseline written against how this application
 * actually behaves — have them reviewed by a lawyer before you take real
 * orders, and fill in the registered business details marked below.
 */

export type LegalSection = { heading: string; body: string[] };

export type LegalPage = {
  slug: string;
  title: string;
  summary: string;
  updated: string;
  sections: LegalSection[];
};

export const LEGAL_PAGES: LegalPage[] = [
  {
    slug: 'shipping-returns',
    title: 'Shipping & returns',
    summary: 'How long delivery takes, what it costs, and how to send something back.',
    updated: '2026-09-01',
    sections: [
      {
        heading: 'Dispatch',
        body: [
          'Orders placed before 2pm on a working day are dispatched the same day. Anything after that goes out the next working day.',
          'You will get an email confirming your order as soon as it is placed. Once your parcel is handed to the courier we will contact you with the tracking details.',
        ],
      },
      {
        heading: 'Delivery times and cost',
        body: [
          'Standard delivery is 3–6 working days across India.',
          'Shipping is free on orders over ₹2,000. Below that, a flat ₹99 applies.',
          'We do not currently ship outside India.',
        ],
      },
      {
        heading: 'How you pay',
        body: [
          'Orders are settled offline: cash on delivery, or bank transfer before dispatch. We will confirm the method with you after you place the order.',
          'Your order is held — with the stock reserved for you — until payment is arranged. We do not take card payments online at present.',
        ],
      },
      {
        heading: 'Cancelling an order',
        body: [
          'You can cancel any order at no cost before it is dispatched. Email ' +
            siteConfig.support.email +
            ' with your order number, or call us, and we will confirm the cancellation.',
          'Once an order has been dispatched it can no longer be cancelled, but you can return it under the policy below.',
          'If we cancel an order — because an item is out of stock, or a price was wrong — we will tell you why and refund anything already paid in full.',
        ],
      },
      {
        heading: 'Returns',
        body: [
          'You have 30 days from delivery to return anything unworn, unwashed and with its tags still attached.',
          'Email ' +
            siteConfig.support.email +
            ' with your order number and we will send a return label.',
          'Refunds are issued to the original payment method within 5–7 working days of the parcel reaching us.',
        ],
      },
      {
        heading: 'Exchanges',
        body: [
          'We do not process direct exchanges. Return the piece for a refund and place a new order for the size or colour you want — it is faster, and it means the size you need is not held up in transit.',
        ],
      },
      {
        heading: 'Faulty items',
        body: [
          'If something arrives damaged or develops a fault, contact us within 30 days and we will replace it or refund you in full, including postage. The 30-day window does not apply to manufacturing faults found later — talk to us.',
        ],
      },
    ],
  },
  {
    slug: 'size-guide',
    title: 'Size guide',
    summary: 'Body measurements in centimetres, and how our pieces are cut.',
    updated: '2026-09-01',
    sections: [
      {
        heading: 'How to measure',
        body: [
          'Measure over your underwear, keeping the tape level and snug but not tight.',
          'Bust: around the fullest part. Waist: at the narrowest point, usually just above the navel. Hip: around the fullest part, roughly 20cm below the waist.',
        ],
      },
      {
        heading: 'Body measurements (cm)',
        body: [
          'XS — Bust 82, Waist 64, Hip 90',
          'S — Bust 86, Waist 68, Hip 94',
          'M — Bust 90, Waist 72, Hip 98',
          'L — Bust 96, Waist 78, Hip 104',
          'XL — Bust 102, Waist 84, Hip 110',
        ],
      },
      {
        heading: 'Fit notes',
        body: [
          'Our kurtis are cut with room through the body and are meant to skim rather than fit close. If you are between sizes, take the smaller one unless you want a looser line.',
          'Salwar sets are sized on the kurta. The bottoms come with a drawstring or elasticated waist, so a small difference at the waist is easily adjusted.',
          'Cotton softens with washing and may relax very slightly through the body. Size for how it fits on day one.',
        ],
      },
    ],
  },
  {
    slug: 'privacy',
    title: 'Privacy policy',
    summary: 'What we collect, why, and what you can ask us to do with it.',
    updated: '2026-09-01',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Account details you give us: name, email address, phone number and delivery addresses.',
          'Order records: what you bought, what you paid, and where it was sent. We keep these because we are required to.',
          'Technical data needed to run the site: a session cookie if you sign in, and a cart cookie so your bag survives a page reload.',
        ],
      },
      {
        heading: 'What we do not collect',
        body: [
          'We never see or store card numbers. Orders are currently settled offline — cash on delivery, or bank transfer — so no card details are collected at any point. If we add a card payment gateway, those details will be handled entirely by that provider and will still never reach our servers.',
          'We do not sell your data, and we do not share it with advertisers.',
        ],
      },
      {
        heading: 'Cookies',
        body: [
          'We use two cookies, both strictly necessary: one identifies your shopping bag, one keeps you signed in. Neither is used for advertising or tracking you across other sites.',
        ],
      },
      {
        heading: 'Marketing email',
        body: [
          'We only email you about new arrivals if you opted in. You can turn it off in your account settings or from any email we send, and we act on it immediately.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'You can ask for a copy of everything we hold about you, ask us to correct it, or ask us to delete your account.',
          'Deleting your account removes your profile and saved addresses. Order records are kept, because tax and consumer law require it — they are retained separately from your marketing profile.',
          'Email ' + siteConfig.support.email + ' and we will respond within 30 days.',
        ],
      },
      {
        heading: 'Grievance officer',
        body: [
          'Under the Consumer Protection (E-Commerce) Rules, 2020 we name an officer responsible for complaints about this site and anything bought through it.',
          '[BEFORE LAUNCH: add the grievance officer’s name and designation here.]',
          'Contact: ' +
            siteConfig.support.email +
            ', or ' +
            siteConfig.support.phone +
            ', ' +
            siteConfig.support.hours +
            '.',
          'We acknowledge every complaint within 48 hours and aim to resolve it within one month of receiving it.',
        ],
      },
      {
        heading: 'Who to contact',
        body: [
          'Questions about this policy: ' + siteConfig.support.email + '.',
          '[BEFORE LAUNCH: add your registered business name, full postal address, and GSTIN if registered.]',
        ],
      },
    ],
  },
  {
    slug: 'terms',
    title: 'Terms of service',
    summary: 'The agreement between you and us when you buy something.',
    updated: '2026-09-01',
    sections: [
      {
        heading: 'Placing an order',
        body: [
          'Your order is an offer to buy. A contract forms when we confirm dispatch, not when you click Place order.',
          'We may decline an order — for example if an item is out of stock, or if a price was listed incorrectly. If we do, you are not charged, and anything already taken is refunded in full.',
        ],
      },
      {
        heading: 'Pricing',
        body: [
          'Prices are shown in Indian rupees. Applicable tax and any delivery charge are added at checkout and itemised there before you confirm.',
          'Prices can change, but never after you have placed an order. The total shown on the checkout page is the amount you pay.',
        ],
      },
      {
        heading: 'Your account',
        body: [
          'Keep your password to yourself. Tell us promptly if you think someone else has access to your account.',
          'We may suspend an account that is being used fraudulently.',
        ],
      },
      {
        heading: 'Returns and your statutory rights',
        body: [
          'Our returns policy sits alongside your legal rights, it does not replace them. Nothing here limits your rights in respect of faulty or misdescribed goods.',
        ],
      },
      {
        heading: 'Payment',
        body: [
          'Orders are settled offline — cash on delivery, or bank transfer before dispatch. We confirm the method with you after the order is placed.',
          'Stock is reserved for you while payment is arranged. If payment is not arranged within a reasonable period we may release the reservation and cancel the order, and we will tell you before we do.',
        ],
      },
      {
        heading: 'Complaints',
        body: [
          'If something goes wrong, contact our grievance officer — named in our privacy policy — and we will acknowledge your complaint within 48 hours and aim to resolve it within one month.',
        ],
      },
      {
        heading: 'Governing law',
        body: [
          'These terms are governed by the laws of India, and the courts at [BEFORE LAUNCH: insert your city, e.g. Coimbatore, Tamil Nadu] have exclusive jurisdiction.',
          '[BEFORE LAUNCH: confirm this with your lawyer, and insert the registered business name these terms are made with.]',
        ],
      },
    ],
  },
];

export function getLegalPage(slug: string): LegalPage | undefined {
  return LEGAL_PAGES.find((page) => page.slug === slug);
}
