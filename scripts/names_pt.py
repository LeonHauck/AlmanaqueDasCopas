"""Traduções e metadados fixos usados pelo gerador de dados."""

# nome em inglês (base Fjelstul / openfootball) -> (nome PT-BR, código da bandeira)
# bandeira: código do flagcdn.com, ou "local:xxx" para arquivos em assets/flags/
TEAMS = {
    "Algeria": ("Argélia", "dz"), "Angola": ("Angola", "ao"), "Argentina": ("Argentina", "ar"),
    "Australia": ("Austrália", "au"), "Austria": ("Áustria", "at"), "Belgium": ("Bélgica", "be"),
    "Bolivia": ("Bolívia", "bo"), "Bosnia and Herzegovina": ("Bósnia e Herzegovina", "ba"),
    "Brazil": ("Brasil", "br"), "Bulgaria": ("Bulgária", "bg"), "Cameroon": ("Camarões", "cm"),
    "Canada": ("Canadá", "ca"), "Chile": ("Chile", "cl"), "China": ("China", "cn"),
    "Colombia": ("Colômbia", "co"), "Costa Rica": ("Costa Rica", "cr"), "Croatia": ("Croácia", "hr"),
    "Cuba": ("Cuba", "cu"), "Czech Republic": ("Tchéquia", "cz"), "Czechoslovakia": ("Tchecoslováquia", "cz"),
    "Denmark": ("Dinamarca", "dk"), "Dutch East Indies": ("Índias Orientais Holandesas", "id"),
    "East Germany": ("Alemanha Oriental", "local:ddr"), "Ecuador": ("Equador", "ec"), "Egypt": ("Egito", "eg"),
    "El Salvador": ("El Salvador", "sv"), "England": ("Inglaterra", "gb-eng"), "France": ("França", "fr"),
    "Germany": ("Alemanha", "de"), "West Germany": ("Alemanha Ocidental", "de"), "Ghana": ("Gana", "gh"),
    "Greece": ("Grécia", "gr"), "Haiti": ("Haiti", "ht"), "Honduras": ("Honduras", "hn"),
    "Hungary": ("Hungria", "hu"), "Iceland": ("Islândia", "is"), "Iran": ("Irã", "ir"), "Iraq": ("Iraque", "iq"),
    "Israel": ("Israel", "il"), "Italy": ("Itália", "it"), "Ivory Coast": ("Costa do Marfim", "ci"),
    "Jamaica": ("Jamaica", "jm"), "Japan": ("Japão", "jp"), "Kuwait": ("Kuwait", "kw"), "Mexico": ("México", "mx"),
    "Morocco": ("Marrocos", "ma"), "Netherlands": ("Holanda", "nl"), "New Zealand": ("Nova Zelândia", "nz"),
    "Nigeria": ("Nigéria", "ng"), "North Korea": ("Coreia do Norte", "kp"),
    "Northern Ireland": ("Irlanda do Norte", "gb-nir"), "Norway": ("Noruega", "no"), "Panama": ("Panamá", "pa"),
    "Paraguay": ("Paraguai", "py"), "Peru": ("Peru", "pe"), "Poland": ("Polônia", "pl"),
    "Portugal": ("Portugal", "pt"), "Qatar": ("Catar", "qa"), "Republic of Ireland": ("Irlanda", "ie"),
    "Romania": ("Romênia", "ro"), "Russia": ("Rússia", "ru"), "Saudi Arabia": ("Arábia Saudita", "sa"),
    "Scotland": ("Escócia", "gb-sct"), "Senegal": ("Senegal", "sn"), "Serbia": ("Sérvia", "rs"),
    "Serbia and Montenegro": ("Sérvia e Montenegro", "local:scg"), "Slovakia": ("Eslováquia", "sk"),
    "Slovenia": ("Eslovênia", "si"), "South Africa": ("África do Sul", "za"),
    "South Korea": ("Coreia do Sul", "kr"), "Soviet Union": ("União Soviética", "local:su"),
    "Spain": ("Espanha", "es"), "Sweden": ("Suécia", "se"), "Switzerland": ("Suíça", "ch"),
    "Togo": ("Togo", "tg"), "Trinidad and Tobago": ("Trinidad e Tobago", "tt"), "Tunisia": ("Tunísia", "tn"),
    "Turkey": ("Turquia", "tr"), "Ukraine": ("Ucrânia", "ua"), "United Arab Emirates": ("Emirados Árabes", "ae"),
    "United States": ("Estados Unidos", "us"), "Uruguay": ("Uruguai", "uy"), "Wales": ("País de Gales", "gb-wls"),
    "Yugoslavia": ("Iugoslávia", "local:yu"), "Zaire": ("Zaire", "cd"), "DR Congo": ("RD Congo", "cd"),
    # estreantes de 2026
    "Curaçao": ("Curaçao", "cw"), "Cape Verde": ("Cabo Verde", "cv"), "Uzbekistan": ("Uzbequistão", "uz"),
    "Jordan": ("Jordânia", "jo"),
}

# nomes do openfootball (2026) -> nomes da base Fjelstul
OF_ALIASES = {"USA": "United States", "Bosnia & Herzegovina": "Bosnia and Herzegovina", "Cabo Verde": "Cape Verde",
              "Congo DR": "DR Congo", "Côte d'Ivoire": "Ivory Coast"}

# seleções novas em 2026 (não existem na base até 2022): nome -> (código, confederação)
NEW_2026 = {"Curaçao": ("CUW", "CONCACAF"), "Cape Verde": ("CPV", "CAF"),
            "Uzbekistan": ("UZB", "AFC"), "Jordan": ("JOR", "AFC")}

# seleção "atual" usada como nome principal de cada código
CANONICAL = {"DEU": "Germany", "COD": "DR Congo", "IDN": "Dutch East Indies"}

COUNTRIES = {  # países-sede e países de estádios
    "Uruguay": "Uruguai", "Italy": "Itália", "France": "França", "Brazil": "Brasil", "Switzerland": "Suíça",
    "Sweden": "Suécia", "Chile": "Chile", "England": "Inglaterra", "Mexico": "México",
    "West Germany": "Alemanha Ocidental", "Germany": "Alemanha", "Argentina": "Argentina", "Spain": "Espanha",
    "United States": "Estados Unidos", "South Korea": "Coreia do Sul", "Japan": "Japão",
    "South Africa": "África do Sul", "Russia": "Rússia", "Qatar": "Catar", "Canada": "Canadá",
}

STAGES = {  # chave interna -> (nome PT, ordem, "peso" para melhor campanha)
    "group stage": ("Fase de grupos", 1, 10),
    "second group stage": ("2ª fase de grupos", 2, 45),
    "final round": ("Quadrangular final", 6, 60),
    "round of 32": ("16 avos de final", 2, 30),
    "round of 16": ("Oitavas de final", 3, 40),
    "quarter-finals": ("Quartas de final", 4, 50),
    "semi-finals": ("Semifinal", 5, 65),
    "third-place match": ("Disputa do 3º lugar", 6, 0),
    "final": ("Final", 7, 0),
}

AWARDS = {
    "Golden Ball": ("bola_ouro", "Bola de Ouro"), "Silver Ball": ("bola_prata", "Bola de Prata"),
    "Bronze Ball": ("bola_bronze", "Bola de Bronze"), "Golden Boot": ("chuteira_ouro", "Chuteira de Ouro"),
    "Silver Boot": ("chuteira_prata", "Chuteira de Prata"), "Bronze Boot": ("chuteira_bronze", "Chuteira de Bronze"),
    "Golden Glove": ("luva_ouro", "Luva de Ouro"), "Best Young Player": ("jovem", "Melhor Jogador Jovem"),
}

POSITIONS = {"GK": "Goleiro", "DF": "Defensor", "MF": "Meio-campista", "FW": "Atacante",
             "CB": "Zagueiro", "SW": "Líbero", "LB": "Lateral-esquerdo", "RB": "Lateral-direito",
             "LWB": "Ala esquerdo", "RWB": "Ala direito", "DM": "Volante", "CM": "Meio-campista",
             "AM": "Meia-atacante", "LM": "Meia-esquerda", "RM": "Meia-direita", "LW": "Ponta-esquerda",
             "RW": "Ponta-direita", "CF": "Centroavante", "SS": "Segundo atacante", "LF": "Atacante",
             "RF": "Atacante"}

# Uma linha de contexto para cada edição (texto editorial do site)
STORIES = {
    1930: "A primeira Copa do Mundo, com 13 seleções convidadas. O Uruguai, bicampeão olímpico, venceu a Argentina na final no recém-inaugurado Estádio Centenário.",
    1934: "Primeira Copa com eliminatórias e disputada só em mata-mata. A Itália venceu em casa, batendo a Tchecoslováquia na prorrogação em Roma.",
    1938: "Às vésperas da Segunda Guerra, a Itália de Vittorio Pozzo se tornou a primeira bicampeã. Leônidas da Silva, o Diamante Negro, foi o artilheiro.",
    1950: "A volta após 12 anos sem Copa. Sem final oficial, o quadrangular decisivo terminou com o 'Maracanaço': Uruguai 2 x 1 Brasil diante de quase 200 mil pessoas.",
    1954: "O 'Milagre de Berna': a Alemanha Ocidental virou sobre a Hungria de Puskás, invicta havia quatro anos. Copa recordista de média de gols.",
    1958: "O Brasil de Garrincha, Didi e de um Pelé de 17 anos conquistou o primeiro título. Just Fontaine marcou 13 gols, recorde em uma só edição.",
    1962: "Com Pelé lesionado, Garrincha carregou o Brasil ao bicampeonato. A Copa ficou marcada também pela violenta 'Batalha de Santiago'.",
    1966: "A Inglaterra venceu em casa, com o gol polêmico de Geoff Hurst na final em Wembley. Eusébio brilhou por Portugal e foi o artilheiro.",
    1970: "A primeira Copa transmitida em cores. O Brasil de Pelé, Jairzinho, Tostão e Rivellino conquistou o tri e ficou com a Taça Jules Rimet em definitivo.",
    1974: "A estreia da Taça FIFA. A 'Laranja Mecânica' de Cruyff encantou, mas a Alemanha Ocidental de Beckenbauer e Gerd Müller ficou com o título em Munique.",
    1978: "Em casa, a Argentina de Kempes conquistou seu primeiro título, vencendo a Holanda na prorrogação da final no Monumental de Núñez.",
    1982: "A primeira Copa com 24 seleções. O Brasil de Telê encantou, mas caiu para a Itália de Paolo Rossi na 'Tragédia do Sarriá'. A Itália chegou ao tri.",
    1986: "A Copa de Maradona: a 'Mão de Deus' e o gol do século contra a Inglaterra no mesmo jogo. A Argentina foi bicampeã no Estádio Azteca.",
    1990: "Copa de poucos gols e muitas disputas de pênaltis. A Alemanha Ocidental se vingou da Argentina na final em Roma e chegou ao tri.",
    1994: "Nos Estados Unidos, Romário e Bebeto levaram o Brasil ao tetra, na primeira final decidida nos pênaltis, contra a Itália, no Rose Bowl.",
    1998: "A primeira Copa com 32 seleções. Zidane marcou duas vezes de cabeça na final e a França venceu o Brasil por 3 x 0 no Stade de France.",
    2002: "A primeira Copa na Ásia e com duas sedes. Ronaldo, recuperado de grave lesão, marcou 8 gols e levou o Brasil ao penta.",
    2006: "A Itália foi tetra nos pênaltis contra a França, em final marcada pela cabeçada de Zidane em Materazzi. Klose foi o artilheiro.",
    2010: "A primeira Copa na África. A Espanha do tiki-taka conquistou o título inédito com gol de Iniesta na prorrogação contra a Holanda.",
    2014: "No Brasil, o anfitrião sofreu o histórico 7 x 1 para a Alemanha na semifinal. Os alemães foram tetra com gol de Götze na final no Maracanã.",
    2018: "Copa do VAR. A França de Mbappé e Griezmann venceu a surpreendente Croácia de Modric por 4 x 2 na final em Moscou.",
    2022: "A primeira Copa no Oriente Médio e no fim do ano. Na final considerada a maior da história, Messi levou a Argentina ao tri sobre a França de Mbappé, nos pênaltis.",
    2026: "A primeira Copa com 48 seleções e três países-sede. A Espanha conquistou o bicampeonato ao vencer a Argentina na prorrogação, com gol de Ferran Torres, no MetLife Stadium. Mbappé foi artilheiro com 10 gols e se tornou o maior goleador da história das Copas.",
}

HOSTS_2026 = ["United States", "Canada", "Mexico"]
