import { MenuItem, Order, OrderStatus } from '../types';

export const initialMenu: MenuItem[] = [
  // Aperitive
  {
    id: 'm1',
    category: 'Aperitive',
    name: 'Tartar de vită Black Angus',
    description: 'Cu capere, ceapă eșalotă, gălbenuș confiat și pâine cu maia.',
    price: 85,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    extras: [
      { id: 'e1', name: 'Pâine cu maia extra', price: 10 },
      { id: 'e2', name: 'Fără capere', price: 0 }
    ]
  },
  {
    id: 'm2',
    category: 'Aperitive',
    name: 'Burrata artizanală',
    description: 'Roșii de grădină, pesto de busuioc, muguri de pin și ulei de măsline extravirgin.',
    price: 55,
    image: 'https://images.unsplash.com/photo-1577906096429-f73c2c312435?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    extras: [
      { id: 'e3', name: 'Fără muguri de pin', price: 0 }
    ]
  },
  {
    id: 'm3',
    category: 'Aperitive',
    name: 'Carpaccio de caracatiță',
    description: 'Emulsie de lămâie, piper roz și micro-ierburi proaspete.',
    price: 75,
    image: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
  },
  
  // Feluri principale
  {
    id: 'm4',
    category: 'Feluri principale',
    name: 'Mușchiuleț de vită',
    description: 'Piure de trufe negre, sparanghel tras la tigaie și sos demiglace.',
    price: 120,
    image: 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    extras: [
      { id: 'e4', name: 'Extra sos demiglace', price: 8 },
      { id: 'e5', name: 'Bine făcut (Well done)', price: 0 }
    ]
  },
  {
    id: 'm5',
    category: 'Feluri principale',
    name: 'File de biban de mare',
    description: 'Cu risotto cu șofran și spumă fină de lămâie.',
    price: 95,
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
  },
  {
    id: 'm6',
    category: 'Feluri principale',
    name: 'Risotto cu hribi',
    description: 'Orez carnaroli, hribi de pădure, parmezan maturat 24 de luni.',
    price: 65,
    image: 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
    extras: [
      { id: 'e6', name: 'Extra parmezan', price: 10 },
      { id: 'e7', name: 'Fără unt', price: 0 }
    ]
  },
  {
    id: 'm7',
    category: 'Feluri principale',
    name: 'Piept de rață confiat',
    description: 'Piure de păstârnac, sos de fructe de pădure și legume sote.',
    price: 85,
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
  },

  // Desert
  {
    id: 'm8',
    category: 'Desert',
    name: 'Lava cake artizanal',
    description: 'Ciocolată belgiană caldă, înghețată artizanală de vanilie de Madagascar.',
    price: 45,
    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
  },
  {
    id: 'm9',
    category: 'Desert',
    name: 'Tiramisu clasic',
    description: 'Pișcoturi însiropate în espresso, cremă de mascarpone fină și cacao.',
    price: 45,
    image: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
  },

  // Băuturi
  {
    id: 'm10',
    category: 'Băuturi',
    name: 'Limonadă cu mentă',
    description: 'Lămâi proaspete, mentă, sirop natural de agave. 400ml.',
    price: 25,
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
  },
  {
    id: 'm11',
    category: 'Băuturi',
    name: 'Vin roșu Fetească Neagră',
    description: 'Pahar 150ml - note de prune uscate, condimente și vanilie.',
    price: 35,
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
  },
  {
    id: 'm12',
    category: 'Băuturi',
    name: 'Apă minerală',
    description: 'Sticlă 750ml, apă minerală naturală.',
    price: 15,
    image: 'https://images.unsplash.com/photo-1560023907-5f339617ea30?auto=format&fit=crop&q=80&w=600',
    available: true,
    stock: 10,
  }
];

export const mockOrders: Order[] = [
  {
    id: 'ORD-001',
    items: [
      { id: 'c1', menuItem: initialMenu[0], quantity: 1, selectedExtras: [] },
      { id: 'c2', menuItem: initialMenu[3], quantity: 1, selectedExtras: [] }
    ],
    status: 'În preparare',
    type: 'livrare',
    total: 205,
    customerName: 'Andrei Ionescu',
    customerPhone: '0740123456',
    time: 'Cât mai repede (30–45 min)',
    paymentMethod: 'card',
    createdAt: new Date(Date.now() - 15 * 60000),
    address: 'Bulevardul Magheru 12, București',
    coordinates: { lat: 44.4383, lng: 26.0976 } // Magheru, near Piata Romana
  },
  {
    id: 'ORD-002',
    items: [
      { id: 'c3', menuItem: initialMenu[1], quantity: 2, selectedExtras: [] },
      { id: 'c4', menuItem: initialMenu[8], quantity: 2, selectedExtras: [] }
    ],
    status: 'Gata de ridicare', // changed from 'Pe drum' to 'Gata de ridicare' so it's ready for the courier to pick up
    type: 'livrare',
    total: 200,
    customerName: 'Maria Popescu',
    customerPhone: '0722987654',
    time: '19:30',
    paymentMethod: 'cash',
    createdAt: new Date(Date.now() - 45 * 60000),
    address: 'Strada Lipscani 19, București',
    coordinates: { lat: 44.4319, lng: 26.1011 } // Centrul vechi
  },
  {
    id: 'ORD-003',
    items: [
      { id: 'c5', menuItem: initialMenu[5], quantity: 1, selectedExtras: [] }
    ],
    status: 'Pe drum',
    type: 'livrare',
    total: 65,
    customerName: 'Cristian Stan',
    customerPhone: '0755112233',
    time: '14:00',
    paymentMethod: 'cash',
    createdAt: new Date(Date.now() - 60 * 60000),
    address: 'Calea Victoriei 100, București',
    coordinates: { lat: 44.4452, lng: 26.0901 } // Piata Victoriei
  }
];
