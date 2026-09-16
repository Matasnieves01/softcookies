export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  unit: string;
  image: string;
  shortDescription: string;
  longDescription: string;
  details: string[];
  ingredients: string[];
  batchDates: string;
  locations: string[];
  totalSlots: number;
  reservedSlots: number;
}

export const products: Product[] = [
  {
    id: "tarta-vasca",
    slug: "tarta-vasca",
    name: "Tarta Vasca con Frutos Rojos",
    subtitle: "Cremosa, tostada y con topping casero",
    price: 6.50,
    unit: "/ porción",
    image: "/images/tarta-vasca.jpg",
    shortDescription: "Receta artesanal horneada con centro ultra fundente y compota fresca de frutos rojos silvestres.",
    longDescription: "Nuestra clásica Tarta Vasca horneada a alta temperatura para lograr ese característico exterior caramelizado y tostado, manteniendo un corazón suave, sedoso y ultra cremoso que se funde en cada bocado. Coronada con una compota casera reducida a fuego lento con frutos rojos seleccionados.",
    details: [
      "Porción generosa en domo individual de protección",
      "Consumir fría o a temperatura ambiente",
      "Elaborada el mismo día de entrega para máxima frescura",
      "Mantener refrigerada hasta el momento de disfrutar"
    ],
    ingredients: [
      "Queso crema premium",
      "Crema de leche fresca de granja",
      "Huevos de campo frescos",
      "Compota casera de fresas, moras y arándanos silvestres",
      "Toque sutil de vainilla natural de Madagascar"
    ],
    batchDates: "Sábado 21 & Domingo 22 Sept",
    locations: ["Tierras Altas", "Bugaba", "David"],
    totalSlots: 25,
    reservedSlots: 17
  },
  {
    id: "pack-fin-de-semana",
    slug: "pack-fin-de-semana",
    name: "Caja Degustación Fin de Semana",
    subtitle: "Mix exclusivo de 4 especialidades de la chef",
    price: 14.00,
    unit: "/ box",
    image: "/images/tarta-vasca.jpg",
    shortDescription: "2 Soft Cookies Chunky Chocolate + 1 Red Velvet Cream + 1 Porción de Tarta Vasca artesanal.",
    longDescription: "La combinación perfecta para compartir o disfrutar durante el fin de semana. Una cuidada selección de nuestras galletas más suaves y doradas rellenas de chunks de chocolate belga, complementadas con nuestra irresistible porción de Tarta Vasca.",
    details: [
      "Empaque especial para regalo con cinta",
      "Incluye instrucciones para calentar las cookies 15s al microondas",
      "Viene con tarjeta con dedicatoria opcional"
    ],
    ingredients: [
      "Mantequilla pura de pastoreo",
      "Chocolate belga al 54% y 70%",
      "Harinas seleccionadas sin blanquear",
      "Queso crema y frutos frescos"
    ],
    batchDates: "Sábado 21 & Domingo 22 Sept",
    locations: ["Tierras Altas", "Bugaba", "David"],
    totalSlots: 15,
    reservedSlots: 10
  }
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}
