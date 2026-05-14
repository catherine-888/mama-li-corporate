import type { Bundle, AlaCarteItem, Timeslot, Location } from './types';

// ─────────────────────────────────────────────────────────────
//  Menu — ported from the design prototype. Edit prices, copy,
//  and items here; changes flow to the menu screen automatically.
// ─────────────────────────────────────────────────────────────

export const BUNDLES: Bundle[] = [
  {
    id: 'b-platter-classic',
    cat: 'platters',
    name: 'The Classic Siu Mei Platter',
    subtitle: 'Family-style sharing — feeds 8–10',
    description:
      'Our four roast-meat heroes carved to share — char siu, roast duck, soy chicken and crispy belly pork — with steamed jasmine rice, choi sum in oyster sauce and house chilli oil.',
    serves: '8–10',
    price: 185,
    tag: 'Bestseller',
    cn: '燒臘',
    img: 'https://images.unsplash.com/photo-1623689046286-01d812b1b1c5?w=1000&q=80&auto=format&fit=crop',
    contains: ['Char siu', 'Roast duck', 'Soy chicken', 'Crispy pork', 'Jasmine rice', 'Choi sum', 'Chilli oil'],
  },
  {
    id: 'b-platter-veg',
    cat: 'platters',
    name: 'The Garden Platter',
    subtitle: 'Plant-based sharing — feeds 8–10',
    description:
      'Hong Kong–style aubergine claypot, mapo tofu, stir-fried gai lan with garlic, mushroom chow mein and steamed jasmine rice. Built to share, all plants.',
    serves: '8–10',
    price: 160,
    tag: 'Vegan',
    cn: '素菜',
    img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&q=80&auto=format&fit=crop',
    contains: ['Aubergine claypot', 'Mapo tofu', 'Gai lan', 'Mushroom chow mein', 'Jasmine rice'],
  },
  {
    id: 'b-platter-feast',
    cat: 'platters',
    name: 'The Hong Kong Feast',
    subtitle: 'Sharing banquet — feeds 14–16',
    description:
      'Our biggest spread. All four roast meats, salt-and-pepper squid, sweet-and-sour pork, prawn har gow, pork siu mai, two seasonal greens, fried rice and jasmine rice.',
    serves: '14–16',
    price: 320,
    tag: 'For a room',
    cn: '盛宴',
    img: 'https://images.unsplash.com/photo-1626202373474-87f3346d1d4f?w=1200&q=80&auto=format&fit=crop',
    contains: ['4 roast meats', 'Salt & pepper squid', 'Har gow', 'Pork siu mai', 'Fried rice', '+4 more'],
  },
  {
    id: 'b-lunch-rice',
    cat: 'lunchboxes',
    name: 'Rice Box Lunch — per person',
    subtitle: 'Individually-boxed working lunch',
    description:
      'Choose-your-own rice boxes for every person on the call. Each box: one to three roast meats, your choice of base, greens, pickle and our chilli oil. Labelled with names on request.',
    serves: 'per person',
    price: 14.5,
    tag: 'Min. 10',
    cn: '飯盒',
    img: 'https://images.unsplash.com/photo-1617622141533-91d97ff7fb73?w=1000&q=80&auto=format&fit=crop',
    contains: ['Char siu / duck / chicken / pork / tofu', 'Jasmine or egg fried rice', 'Greens', 'Pickle'],
    modifiers: [
      {
        id: 'meats',
        label: 'How many roast meats?',
        sub: 'Per person, per box',
        required: true,
        options: [
          { id: '1', label: '1 meat', sub: 'Pick one roast', delta: 0 },
          { id: '2', label: '2 meats', sub: 'Pick any two', delta: 3 },
          { id: '3', label: '3 meats', sub: 'Pick any three', delta: 6 },
        ],
      },
      {
        id: 'meatChoice',
        label: 'Which meats?',
        sub: 'Choose from our roasts',
        type: 'multi',
        dependsOn: 'meats',
        required: true,
        options: [
          { id: 'charsiu', label: 'Char siu', sub: '叉燒 · BBQ pork' },
          { id: 'duck', label: 'Roast duck', sub: '燒鴨 · Cantonese-style' },
          { id: 'pork', label: 'Crispy pork', sub: '燒肉 · Siu yuk, crackling' },
          { id: 'chicken', label: 'Soy chicken', sub: '豉油雞 · Si yau gai' },
        ],
      },
      {
        id: 'base',
        label: 'Base',
        sub: 'Choose one',
        required: true,
        options: [
          { id: 'jasmine', label: 'Steamed jasmine rice', sub: 'Classic', delta: 0 },
          { id: 'fried', label: 'Egg fried rice', sub: 'Wok-tossed, +£1.50', delta: 1.5 },
        ],
      },
    ],
  },
  {
    id: 'b-lunch-noodle',
    cat: 'lunchboxes',
    name: 'Noodle Box Lunch — per person',
    subtitle: 'Individually-boxed working lunch',
    description:
      'House-made wontons or dry-tossed soy noodles, each in its own box. Add one to three roast meats. Scratch broth, fresh greens and a side of chilli crisp.',
    serves: 'per person',
    price: 13.5,
    tag: 'Min. 10',
    cn: '麵食',
    img: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=1000&q=80&auto=format&fit=crop',
    contains: ['Wonton or soy noodle base', '1–3 roast meats', 'Bok choi', 'Chilli crisp'],
    modifiers: [
      {
        id: 'meats',
        label: 'How many roast meats?',
        sub: 'Per person, per box',
        required: true,
        options: [
          { id: '1', label: '1 meat', sub: 'Pick one roast', delta: 0 },
          { id: '2', label: '2 meats', sub: 'Pick any two', delta: 3 },
          { id: '3', label: '3 meats', sub: 'Pick any three', delta: 6 },
        ],
      },
      {
        id: 'meatChoice',
        label: 'Which meats?',
        sub: 'Choose from our roasts',
        type: 'multi',
        dependsOn: 'meats',
        required: true,
        options: [
          { id: 'charsiu', label: 'Char siu', sub: '叉燒 · BBQ pork' },
          { id: 'duck', label: 'Roast duck', sub: '燒鴨 · Cantonese-style' },
          { id: 'pork', label: 'Crispy pork', sub: '燒肉 · Siu yuk, crackling' },
          { id: 'chicken', label: 'Soy chicken', sub: '豉油雞 · Si yau gai' },
        ],
      },
      {
        id: 'base',
        label: 'Noodle base',
        sub: 'Choose one',
        required: true,
        options: [
          { id: 'wonton', label: 'Wonton noodle soup', sub: 'Scratch broth', delta: 0 },
          { id: 'soy', label: 'Dry-tossed soy noodle', sub: 'Chilli crisp on side', delta: 0 },
        ],
      },
    ],
  },
  {
    id: 'b-lunch-mixed',
    cat: 'lunchboxes',
    name: 'Mixed Boxes — per person',
    subtitle: 'Best of both — half rice, half noodle',
    description:
      'Let people pick at the door. We send a curated mix of rice boxes and noodle boxes labelled clearly. Allergens and dietaries handled per-person.',
    serves: 'per person',
    price: 15,
    tag: 'Most popular',
    cn: '雙拼',
    img: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=1000&q=80&auto=format&fit=crop',
    contains: ['50/50 rice & noodle boxes', 'Labelled per person', 'Dietaries handled'],
  },
  {
    id: 'b-canape-classic',
    cat: 'canapes',
    name: 'Cantonese Canapés — Classic',
    subtitle: '6 pieces per person, drinks reception',
    description:
      'Bite-sized siu mei on steamed buns, prawn toast, crispy wontons, char siu puff, vegetable spring roll and chilli-oil edamame. Passed or set out on boards.',
    serves: 'per person',
    price: 18,
    tag: 'Min. 20',
    cn: '點心',
    img: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=1000&q=80&auto=format&fit=crop',
    contains: ['Char siu bao bite', 'Prawn toast', 'Crispy wonton', 'Char siu puff', 'Spring roll', 'Edamame'],
  },
  {
    id: 'b-canape-premium',
    cat: 'canapes',
    name: 'Cantonese Canapés — Premium',
    subtitle: '8 pieces per person, drinks reception',
    description:
      'Our classic six plus scallop siu mai and Peking-style duck pancakes rolled to order. The full Hong Kong reception, dressed for the City.',
    serves: 'per person',
    price: 26,
    tag: 'Premium',
    cn: '高級',
    img: 'https://images.unsplash.com/photo-1611270629569-8b357cb88da9?w=1000&q=80&auto=format&fit=crop',
    contains: ['Classic 6', '+ Scallop siu mai', '+ Duck pancakes', 'Rolled to order'],
  },
];

export const ALACARTE: AlaCarteItem[] = [
  { id: 'a-charsiu', name: 'Char siu — half kilo', price: 22, cat: 'Roast meats' },
  { id: 'a-duck', name: 'Roast duck — half', price: 28, cat: 'Roast meats' },
  { id: 'a-pork', name: 'Crispy belly pork — half kilo', price: 24, cat: 'Roast meats' },
  { id: 'a-chicken', name: 'Soy chicken — half', price: 22, cat: 'Roast meats' },
  { id: 'a-rice', name: 'Jasmine rice — 10 portions', price: 22, cat: 'Sides' },
  { id: 'a-greens', name: 'Choi sum, oyster sauce — large', price: 18, cat: 'Sides' },
  { id: 'a-gailan', name: 'Gai lan, garlic — large', price: 18, cat: 'Sides' },
  { id: 'a-cucumber', name: 'Smashed cucumber, chilli oil', price: 14, cat: 'Sides' },
  { id: 'a-hargow', name: 'Prawn har gow — 24 pcs', price: 28, cat: 'Dim sum' },
  { id: 'a-siumai', name: 'Pork siu mai — 24 pcs', price: 26, cat: 'Dim sum' },
  { id: 'a-buns', name: 'Char siu buns — 12 pcs', price: 24, cat: 'Dim sum' },
  { id: 'a-tea', name: 'Iced jasmine tea — 2L bottle', price: 12, cat: 'Drinks' },
  { id: 'a-soda', name: 'Salted plum soda — 12 cans', price: 28, cat: 'Drinks' },
  { id: 'a-chilli', name: 'House chilli oil — 250ml jar', price: 8, cat: 'Pantry' },
];

export const TIMESLOTS: Timeslot[] = [
  { id: '11-12', label: '11:00 – 12:00', tag: 'Early lunch' },
  { id: '12-13', label: '12:00 – 13:00', tag: 'Lunch service' },
  { id: '13-14', label: '13:00 – 14:00', tag: 'Mid-lunch' },
  { id: '14-15', label: '14:00 – 15:00', tag: 'Late lunch' },
  { id: '15-16', label: '15:00 – 16:00', tag: 'Afternoon' },
];

export const LOCATIONS: Location[] = [
  {
    id: 'london-wall',
    name: 'London Wall',
    addr: '49 London Wall, London EC2M 5TE',
    pickup: 'Pickup hatch · Mon–Fri',
    cn: '城牆店',
  },
  {
    id: 'tower-hill',
    name: 'Tower Hill',
    addr: '22 Great Tower St, London EC3R 5AQ',
    pickup: 'Counter pickup · Mon–Fri',
    cn: '塔山店',
  },
  {
    id: 'canary-wharf',
    name: 'Canary Wharf',
    addr: '3 West Lane, London E14 5LP',
    pickup: 'Delivery hatch · Mon–Fri',
    cn: '金絲雀店',
  },
];

export const POSTCODE_AREAS = ['EC1', 'EC2', 'EC3', 'EC4'];

export const VAT_RATE = 0.2;
export const DELIVERY_FEE = 15;
