export interface FontPairing {
  id: string;
  label: string;
  serif: string; // → --serif (headings, game names)
  sans: string;  // → --sans (body, UI)
  category: string;
}

// First font in each pair is the display/heading font (→ --serif)
// Second font is the body font (→ --sans)
// DM Mono is always kept for --mono
export const FONT_PAIRINGS: FontPairing[] = [
  // ── Classic ──────────────────────────────────────────────
  { id: 'classic-playfair-sourcesans',       category: 'Classic',    serif: 'Playfair Display',     sans: 'Source Sans Pro'       , label: 'Playfair Display + Source Sans Pro'       },
  { id: 'classic-playfair-alice',            category: 'Classic',    serif: 'Playfair Display',     sans: 'Alice'                 , label: 'Playfair Display + Alice'                 },
  { id: 'classic-quattrocento-quattrocentosans', category: 'Classic', serif: 'Quattrocento',        sans: 'Quattrocento Sans'     , label: 'Quattrocento + Quattrocento Sans'         },
  { id: 'classic-quattrocento-fanwood',      category: 'Classic',    serif: 'Quattrocento',         sans: 'Fanwood Text'          , label: 'Quattrocento + Fanwood Text'              },
  { id: 'classic-oswald-quattrocento',       category: 'Classic',    serif: 'Oswald',               sans: 'Quattrocento'          , label: 'Oswald + Quattrocento'                   },
  { id: 'classic-fjalla-baskerville',        category: 'Classic',    serif: 'Fjalla One',           sans: 'Libre Baskerville'     , label: 'Fjalla One + Libre Baskerville'           },
  { id: 'classic-lustria-lato',              category: 'Classic',    serif: 'Lustria',              sans: 'Lato'                  , label: 'Lustria + Lato'                          },
  { id: 'classic-cormorant-proza',           category: 'Classic',    serif: 'Cormorant Garamond',   sans: 'Proza Libre'           , label: 'Cormorant Garamond + Proza Libre'         },
  { id: 'classic-oswald-garamond',           category: 'Classic',    serif: 'Oswald',               sans: 'EB Garamond'           , label: 'Oswald + EB Garamond'                    },
  { id: 'classic-baskerville-sourcesans',    category: 'Classic',    serif: 'Libre Baskerville',    sans: 'Source Sans Pro'       , label: 'Libre Baskerville + Source Sans Pro'      },
  // ── Elegant ──────────────────────────────────────────────
  { id: 'elegant-cinzel-fauna',              category: 'Elegant',    serif: 'Cinzel',               sans: 'Fauna One'             , label: 'Cinzel + Fauna One'                      },
  { id: 'elegant-sacramento-alice',          category: 'Elegant',    serif: 'Sacramento',           sans: 'Alice'                 , label: 'Sacramento + Alice'                      },
  { id: 'elegant-yeseva-josefin',            category: 'Elegant',    serif: 'Yeseva One',           sans: 'Josefin Sans'          , label: 'Yeseva One + Josefin Sans'               },
  { id: 'elegant-baskerville-montserrat',    category: 'Elegant',    serif: 'Libre Baskerville',    sans: 'Montserrat'            , label: 'Libre Baskerville + Montserrat'           },
  { id: 'elegant-cardo-josefin',             category: 'Elegant',    serif: 'Cardo',                sans: 'Josefin Sans'          , label: 'Cardo + Josefin Sans'                    },
  { id: 'elegant-lora-roboto',               category: 'Elegant',    serif: 'Lora',                 sans: 'Roboto'                , label: 'Lora + Roboto'                           },
  { id: 'elegant-spectral-karla',            category: 'Elegant',    serif: 'Spectral',             sans: 'Karla'                 , label: 'Spectral + Karla'                        },
  { id: 'elegant-halant-nunito',             category: 'Elegant',    serif: 'Halant',               sans: 'Nunito Sans'           , label: 'Halant + Nunito Sans'                    },
  { id: 'elegant-karla-karla',               category: 'Elegant',    serif: 'Karla',                sans: 'Karla'                 , label: 'Karla + Karla'                           },
  { id: 'elegant-lora-merriweather',         category: 'Elegant',    serif: 'Lora',                 sans: 'Merriweather'          , label: 'Lora + Merriweather'                     },
  // ── Modern ───────────────────────────────────────────────
  { id: 'modern-roboto-nunito',              category: 'Modern',     serif: 'Roboto',               sans: 'Nunito'                , label: 'Roboto + Nunito'                         },
  { id: 'modern-quicksand',                  category: 'Modern',     serif: 'Quicksand',            sans: 'Quicksand'             , label: 'Quicksand + Quicksand'                   },
  { id: 'modern-ubuntu-opensans',            category: 'Modern',     serif: 'Ubuntu',               sans: 'Open Sans'             , label: 'Ubuntu + Open Sans'                      },
  { id: 'modern-montserrat-hind',            category: 'Modern',     serif: 'Montserrat',           sans: 'Hind'                  , label: 'Montserrat + Hind'                       },
  { id: 'modern-nunito-ptsans',              category: 'Modern',     serif: 'Nunito',               sans: 'PT Sans'               , label: 'Nunito + PT Sans'                        },
  { id: 'modern-oswald-merriweather',        category: 'Modern',     serif: 'Oswald',               sans: 'Merriweather'          , label: 'Oswald + Merriweather'                   },
  { id: 'modern-montserrat-cardo',           category: 'Modern',     serif: 'Montserrat',           sans: 'Cardo'                 , label: 'Montserrat + Cardo'                      },
  { id: 'modern-montserrat-crimson',         category: 'Modern',     serif: 'Montserrat',           sans: 'Crimson Text'          , label: 'Montserrat + Crimson Text'               },
  { id: 'modern-opensans-condensed',         category: 'Modern',     serif: 'Open Sans',            sans: 'Open Sans Condensed'   , label: 'Open Sans + Open Sans Condensed'         },
  { id: 'modern-nunito-nunito',              category: 'Modern',     serif: 'Nunito',               sans: 'Nunito'                , label: 'Nunito + Nunito'                         },
  // ── Creative ─────────────────────────────────────────────
  { id: 'creative-arvo-lato',               category: 'Creative',   serif: 'Arvo',                 sans: 'Lato'                  , label: 'Arvo + Lato'                             },
  { id: 'creative-abril-poppins',            category: 'Creative',   serif: 'Abril Fatface',        sans: 'Poppins'               , label: 'Abril Fatface + Poppins'                 },
  { id: 'creative-playfair-sourcesans',      category: 'Creative',   serif: 'Playfair Display',     sans: 'Source Sans Pro'       , label: 'Playfair Display + Source Sans Pro'       },
  { id: 'creative-karla-inconsolata',        category: 'Creative',   serif: 'Karla',                sans: 'Inconsolata'           , label: 'Karla + Inconsolata'                     },
  { id: 'creative-ultra-slabo',              category: 'Creative',   serif: 'Ultra',                sans: 'Slabo 27px'            , label: 'Ultra + Slabo 27px'                      },
  { id: 'creative-nixie-ledger',             category: 'Creative',   serif: 'Nixie One',            sans: 'Ledger'                , label: 'Nixie One + Ledger'                      },
  { id: 'creative-stint-pontano',            category: 'Creative',   serif: 'Stint Ultra Expanded', sans: 'Pontano Sans'          , label: 'Stint Ultra Expanded + Pontano Sans'     },
  { id: 'creative-amatic-andika',            category: 'Creative',   serif: 'Amatic SC',            sans: 'Andika'                , label: 'Amatic SC + Andika'                      },
  { id: 'creative-unica-crimson',            category: 'Creative',   serif: 'Unica One',            sans: 'Crimson Text'          , label: 'Unica One + Crimson Text'                },
  { id: 'creative-philosopher-mulish',       category: 'Creative',   serif: 'Philosopher',          sans: 'Mulish'                , label: 'Philosopher + Mulish'                    },
  // ── Minimalist ───────────────────────────────────────────
  { id: 'min-sourcesans-sourceserif',        category: 'Minimalist', serif: 'Source Sans Pro',      sans: 'Source Serif Pro'      , label: 'Source Sans Pro + Source Serif Pro'      },
  { id: 'min-fjalla-cantarell',              category: 'Minimalist', serif: 'Fjalla One',           sans: 'Cantarell'             , label: 'Fjalla One + Cantarell'                  },
  { id: 'min-worksans-opensans',             category: 'Minimalist', serif: 'Work Sans',            sans: 'Open Sans'             , label: 'Work Sans + Open Sans'                   },
  { id: 'min-hind-opensans',                 category: 'Minimalist', serif: 'Hind',                 sans: 'Open Sans'             , label: 'Hind + Open Sans'                        },
  { id: 'min-nunito-opensans',               category: 'Minimalist', serif: 'Nunito',               sans: 'Open Sans'             , label: 'Nunito + Open Sans'                      },
  { id: 'min-oxygen-sourcesans',             category: 'Minimalist', serif: 'Oxygen',               sans: 'Source Sans Pro'       , label: 'Oxygen + Source Sans Pro'                },
  { id: 'min-ptsans-cabin',                  category: 'Minimalist', serif: 'PT Sans',              sans: 'Cabin'                 , label: 'PT Sans + Cabin'                         },
  { id: 'min-robotocondensed-cabin',         category: 'Minimalist', serif: 'Roboto Condensed',     sans: 'Cabin'                 , label: 'Roboto Condensed + Cabin'                },
  { id: 'min-raleway-opensans',              category: 'Minimalist', serif: 'Raleway',              sans: 'Open Sans'             , label: 'Raleway + Open Sans'                     },
  { id: 'min-roboto-lora',                   category: 'Minimalist', serif: 'Roboto',               sans: 'Lora'                  , label: 'Roboto + Lora'                           },
  // ── Figma ─────────────────────────────────────────────────
  { id: 'figma-abril-lato',                  category: 'Figma',      serif: 'Abril Fatface',        sans: 'Lato'                  , label: 'Abril Fatface + Lato'                    },
  { id: 'figma-fugaz-worksans',              category: 'Figma',      serif: 'Fugaz One',            sans: 'Work Sans'             , label: 'Fugaz One + Work Sans'                   },
  { id: 'figma-spacemono-jakarta',           category: 'Figma',      serif: 'Space Mono',           sans: 'Plus Jakarta Sans'     , label: 'Space Mono + Plus Jakarta Sans'          },
  { id: 'figma-grandhotel-lato',             category: 'Figma',      serif: 'Grand Hotel',          sans: 'Lato'                  , label: 'Grand Hotel + Lato'                      },
  { id: 'figma-raleway-merriweather',        category: 'Figma',      serif: 'Raleway',              sans: 'Merriweather'          , label: 'Raleway + Merriweather'                  },
  { id: 'figma-chonburi-domine',             category: 'Figma',      serif: 'Chonburi',             sans: 'Domine'                , label: 'Chonburi + Domine'                       },
  { id: 'figma-inter-krub',                  category: 'Figma',      serif: 'Inter',                sans: 'Krub'                  , label: 'Inter + Krub'                            },
  { id: 'figma-oswald-sourceserif4',         category: 'Figma',      serif: 'Oswald',               sans: 'Source Serif 4'        , label: 'Oswald + Source Serif 4'                 },
  { id: 'figma-arima-mulish',                category: 'Figma',      serif: 'Arima Madurai',        sans: 'Mulish'                , label: 'Arima Madurai + Mulish'                  },
  { id: 'figma-nunito-lora',                 category: 'Figma',      serif: 'Nunito',               sans: 'Lora'                  , label: 'Nunito + Lora'                           },
  { id: 'figma-montserrat-karla',            category: 'Figma',      serif: 'Montserrat',           sans: 'Karla'                 , label: 'Montserrat + Karla'                      },
  { id: 'figma-sourcesans-alegreya',         category: 'Figma',      serif: 'Source Sans Pro',      sans: 'Alegreya'              , label: 'Source Sans Pro + Alegreya'              },
  { id: 'figma-ubuntu-rokkitt',              category: 'Figma',      serif: 'Ubuntu',               sans: 'Rokkitt'               , label: 'Ubuntu + Rokkitt'                        },
  { id: 'figma-dotgothic-spacemono',         category: 'Figma',      serif: 'DotGothic16',          sans: 'Space Mono'            , label: 'DotGothic16 + Space Mono'                },
  { id: 'figma-playfair-lato',               category: 'Figma',      serif: 'Playfair Display',     sans: 'Lato'                  , label: 'Playfair Display + Lato'                 },
  { id: 'figma-syne-inter',                  category: 'Figma',      serif: 'Syne',                 sans: 'Inter'                 , label: 'Syne + Inter'                            },
  { id: 'figma-yellowtail-rethinksans',      category: 'Figma',      serif: 'Yellowtail',           sans: 'Rethink Sans'          , label: 'Yellowtail + Rethink Sans'               },
  { id: 'figma-rufina-averagesans',          category: 'Figma',      serif: 'Rufina',               sans: 'Average Sans'          , label: 'Rufina + Average Sans'                   },
  { id: 'figma-poiret-montserrat',           category: 'Figma',      serif: 'Poiret One',           sans: 'Montserrat'            , label: 'Poiret One + Montserrat'                 },
  { id: 'figma-sintony-poppins',             category: 'Figma',      serif: 'Sintony',              sans: 'Poppins'               , label: 'Sintony + Poppins'                       },
  { id: 'figma-cardo-hind',                  category: 'Figma',      serif: 'Cardo',                sans: 'Hind'                  , label: 'Cardo + Hind'                            },
  { id: 'figma-bubblegum-opensans',          category: 'Figma',      serif: 'Bubblegum Sans',       sans: 'Open Sans'             , label: 'Bubblegum Sans + Open Sans'              },
  { id: 'figma-archivon-tenor',              category: 'Figma',      serif: 'Archivo Narrow',       sans: 'Tenor Sans'            , label: 'Archivo Narrow + Tenor Sans'             },
  { id: 'figma-rethinksans-spectral',        category: 'Figma',      serif: 'Rethink Sans',         sans: 'Spectral'              , label: 'Rethink Sans + Spectral'                 },
  { id: 'figma-crimsonserif-dmsans',         category: 'Figma',      serif: 'Crimson Pro',          sans: 'DM Sans'               , label: 'Crimson Serif + DM Sans'                 },
  { id: 'figma-youngserif-instrumentsans',   category: 'Figma',      serif: 'Young Serif',          sans: 'Instrument Sans'       , label: 'Young Serif + Instrument Sans'           },
  { id: 'figma-instrumentsans-geist',        category: 'Figma',      serif: 'Instrument Sans',      sans: 'Geist'                 , label: 'Instrument Sans + Geist'                 },
];

export const CATEGORIES = [...new Set(FONT_PAIRINGS.map(p => p.category))];
