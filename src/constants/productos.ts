// Menú real de Cervecería Ogham (cargado a mano desde la carta física, 20/09).
//
// Organizado por categoría porque el backend (Rodrigo) va a mandar los
// productos separados por sección, para no cargar todo junto: cuando el
// cliente toca una categoría en la app, en el futuro eso va a disparar un
// pedido al backend por esa categoría puntual (algo como
// GET /api/productos?categoria=cerveza). Por ahora, mientras no está listo
// el backend real, los datos están fijos acá mismo, ya agrupados de la
// misma forma para que el cambio a futuro sea simple.
export type Producto = {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria: string; // debe coincidir con la "clave" de alguna categoría en CATEGORIAS
};

export type Categoria = {
  clave: string;
  nombre: string;
};

// Orden en el que se muestran las pestañas de categorías en la pantalla
// del menú. Al ser una cervecería, arrancamos con "Cervezas".
export const CATEGORIAS: Categoria[] = [
  { clave: 'cerveza', nombre: 'Cervezas' },
  { clave: 'tragos_con_cerveza', nombre: 'Tragos con Cerveza' },
  { clave: 'sin_alcohol', nombre: 'Sin Alcohol' },
  { clave: 'negroni', nombre: 'Negroni' },
  { clave: 'sour', nombre: 'Sour' },
  { clave: 'cocktails_casa', nombre: 'Cocktails de la Casa' },
  { clave: 'tiki', nombre: 'Tiki Cocktails' },
  { clave: 'clasicos', nombre: 'Classic Cocktails' },
  { clave: 'vinos', nombre: 'Vinos' },
  { clave: 'espumantes', nombre: 'Espumantes y Otros' },
  { clave: 'vodka', nombre: 'Vodka' },
  { clave: 'ron', nombre: 'Ron' },
  { clave: 'tequila', nombre: 'Tequila' },
  { clave: 'whisky', nombre: 'Whiskies' },
];

let siguienteId = 1;
const p = (
  categoria: string,
  nombre: string,
  precio: number,
  descripcion?: string,
): Producto => ({ id: siguienteId++, nombre, precio, categoria, descripcion });

export const PRODUCTOS: Producto[] = [
  // Cervezas — lata 500cc, sin TACC
  p('cerveza', 'Golden Ale', 8000),
  p('cerveza', 'Red Ale', 8000),
  p('cerveza', 'Hazi IPA', 8000),
  p('cerveza', 'Barley Wine', 8000),
  p('cerveza', 'Porter', 8000),
  p('cerveza', 'IPA', 8000),
  p('cerveza', 'APA', 8000),
  p('cerveza', 'Honey', 8000),

  // Tragos con Cerveza
  p('tragos_con_cerveza', 'Jameson Wheat', 13000, 'American + jengibre + almíbar + limón'),
  p('tragos_con_cerveza', 'IBU', 13000, 'Ipa + pomelo + almíbar + Cynar'),
  p('tragos_con_cerveza', 'La Havana Ale', 13000, 'Golden + piña + lima + almíbar + Havana Club'),

  // Sin Alcohol
  p('sin_alcohol', 'Mix Frutal', 10000, 'Lima + azúcar + marucayá + naranja + frutos rojos'),
  p('sin_alcohol', 'Special Lemonade', 8000, 'Limonada tradicional con almíbar de flores de hibisco'),
  p('sin_alcohol', 'Vasuveda', 10000, 'Naranja + limón + azúcar + jengibre + albahaca'),

  // Negroni
  p('negroni', 'Negroni Clásico', 13000, 'Gin + Campari + vermouth rosso'),
  p('negroni', 'Negroni Sbagliato', 13000, 'Campari + vermouth rosso + espumante'),
  p('negroni', 'Coffee Negroni', 13000, 'Gin + licor de café + Campari'),
  p('negroni', 'Boulevardier', 15000, 'Whisky + Campari + vermouth rosso'),

  // Sour
  p('sour', 'Cynar Sour', 12000, 'Cynar + almíbar simple + jugo de lima + clara de huevo'),
  p('sour', 'Pisco Sour', 13000, 'Pisco Capel + jugo de lima + almíbar simple + clara de huevo'),
  p(
    'sour',
    'New York Sour',
    15000,
    'Whisky americano + jugo de lima + almíbar simple + clara de huevo + vino Malbec',
  ),
  p(
    'sour',
    'Jungle Boogie',
    15000,
    'Whisky Jameson + jugo de lima + almíbar simple + pera macerada + clara de huevo',
  ),
  p('sour', 'Malibu Sour', 15000, 'Malibu + maracuyá + jugo de lima + clara de huevo'),

  // Cocktails de la Casa (Special House Cocktails)
  p('cocktails_casa', 'Selva Negra', 13000, 'Absolut Vainilla + Cynar + lima + azúcar + top lima-limón'),
  p('cocktails_casa', 'Citric Chinese', 13000, 'Aconcagua lime + lima + almíbar simple + fortune cookie'),
  p('cocktails_casa', 'Head of Damon', 15000, 'Damonjag + lima + almíbar de canela + pomelo + frutos rojos'),

  // Tiki Cocktails
  p(
    'tiki',
    'Mai Tai',
    17000,
    'Jugo de lima, almíbar de miel, almíbar simple, cointreau, ron Havana blanco, ron Havana dorado, pasta de almendras',
  ),
  p(
    'tiki',
    'Applemeister',
    17000,
    'Jugo de lima, almíbar simple, aquarius de manzana, Jägermeister, hojas de menta',
  ),
  p(
    'tiki',
    'Singapure',
    18000,
    'Jugo de lima, almíbar simple, Beefeater 24, jugo de ananá, cointreau, almíbar de cerezas, Tía María, bitter Angostura, granadina',
  ),

  // Classic Cocktails
  p('clasicos', 'Old Fashioned', 13000, 'Red Label + almíbar de miel + jengibre + limón'),
  p('clasicos', 'Margarita', 13000, 'José Cuervo Silver + triple sec + lima'),
  p('clasicos', 'Penicillin', 15000, 'Azúcar + angostura + whisky + piel de naranja'),

  // Vinos
  p('vinos', 'Dilema Dulce Natural', 21000),
  p('vinos', 'Chenin Dulce', 24000),
  p('vinos', 'Emilia Rosé', 21000),
  p('vinos', 'Trumpeter Doux Dulce', 33000),

  // Espumantes y Otros (espumantes 750, energizantes y medidas)
  p('espumantes', 'Personal Chandon', 16000),
  p('espumantes', 'Mumm Extra Brut', 29000),
  p('espumantes', 'Chandon Extra Brut', 39000),
  p('espumantes', 'Chandon Brut Nature', 43000),
  p('espumantes', 'Chandon Delice', 40000),
  p('espumantes', 'Baron B Extra Brut', 67000),
  p('espumantes', 'Baron B Nature', 83000),
  p('espumantes', 'Pommery', 260000),
  p('espumantes', 'Red Bull x250', 6500),
  p('espumantes', 'Speed x500', 6000),
  p('espumantes', 'Speed x250', 4500),
  p('espumantes', 'Medida Granadina chica', 2000),
  p('espumantes', 'Medida Granadina grande', 4000),

  // Vodka
  p('vodka', 'Beluga', 17000),
  p('vodka', 'Zubrówka', 16000),
  p('vodka', 'Absolut', 15000),
  p('vodka', 'Skyy', 12000),
  p('vodka', 'Smirnoff', 12000),
  p('vodka', 'Vodka Speed', 11000),
  p('vodka', 'Vodka Orange', 11000),
  p('vodka', 'Smirnoff Lata', 11000),

  // Ron
  p('ron', 'Habana 3 Años', 11000),
  p('ron', 'Habana Especial', 12000),
  p('ron', 'Habana 7 Años', 15000),
  p('ron', 'Santa Teresa Añejo', 16000),
  p('ron', 'Appleton Signature', 20000),
  p('ron', 'Appleton Reserva', 23000),

  // Tequila
  p('tequila', 'Cuerna Vaca', 6000),
  p('tequila', 'Conquistador', 8000),
  p('tequila', 'José Cuervo Blanco', 13000),
  p('tequila', 'José Cuervo Dorado', 13000),

  // Whiskies
  p('whisky', 'JB', 10000),
  p('whisky', 'Red Label', 12000),
  p('whisky', "Ballantine's Finest", 10000),
  p('whisky', 'Jim Beam', 12000),
  p('whisky', 'Jameson', 12000),
  p('whisky', 'Jack Daniels', 17000),
  p('whisky', 'Jack Daniels Honey', 17000),
  p('whisky', 'Black Label', 16000),
  p('whisky', 'Chivas', 18000),
  p('whisky', "Buchanan's de Luxe", 18000),
  p('whisky', 'Swing', 39000),
  p('whisky', 'Blue Label', 84000),
];
