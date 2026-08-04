/**
 * Source unique de vérité du site DevFest Yaoundé.
 * Toutes les données proviennent des pages publiques de GDG Yaoundé
 * (gdg.community.dev/gdg-yaounde) et de la fiche DevFest Yaoundé 2025.
 * Pour publier une nouvelle édition, il suffit d'éditer ce fichier.
 */
window.DEVFEST = {
  event: {
    city: "Yaoundé",
    cityDisplay: "YAOUNDE", // sans accent : la fonte d'affichage Akira est capitales latines
    year: "2025",
    name: "DevFest Yaoundé 2025",
    tagline: "Le plus grand rendez-vous tech de Yaoundé",
    edition: "12e année de DevFest — et le début de la 2e décennie de la communauté GDG.",
    datesShort: "18 & 25 octobre 2025",
    venueShort: "IYF Center, Mvog-Bi — Yaoundé",
    price: "Participation 100% gratuite",
    rsvp: 643,
    registerUrl:
      "https://gdg.community.dev/events/details/google-gdg-yaounde-presents-devfest-yaounde-2025/",
    communityUrl: "https://gdg.community.dev/gdg-yaounde/",
    whatsappUrl: "https://chat.whatsapp.com/IaC62znKqJlK1RmP5cOIl4",
    intro:
      "DevFest Yaoundé est le plus grand événement Google Developer Group de la ville de Yaoundé. Deux journées dédiées à l'innovation, à l'apprentissage et à la communauté : des conférences et une table ronde le 18 octobre, puis des ateliers pratiques le 25 octobre.",
  },

  community: {
    name: "GDG Yaoundé",
    members: 1915,
    description:
      "GDG Yaoundé est une communauté dynamique de développeurs, d'enthousiastes de la technologie et d'innovateurs. Rencontres, ateliers, conférences inspirantes et opportunités de réseautage — pour tous les niveaux.",
    mission:
      "Créer un pont entre les talents technologiques de la ville, les entreprises et les opportunités mondiales : démocratiser l'accès aux technologies de pointe, encourager la création de solutions locales aux problèmes de société et former une génération de développeurs camerounais hautement compétitifs à l'international.",
    disclaimer:
      "GDG Yaoundé est un groupe indépendant ; ses activités et ses opinions n'engagent pas Google.",
    socials: [
      { label: "X", url: "https://x.com/GDGYaounde", icon: "x" },
      { label: "LinkedIn", url: "https://gdg.community.dev/gdg-yaounde/", icon: "linkedin" },
      { label: "WhatsApp", url: "https://chat.whatsapp.com/IaC62znKqJlK1RmP5cOIl4", icon: "whatsapp" },
      { label: "Communauté GDG", url: "https://gdg.community.dev/gdg-yaounde/", icon: "globe" },
    ],
  },

  /** Les deux « passes » — l'entrée est gratuite, on remplace la billetterie payante. */
  passes: [
    {
      id: "conference",
      variant: "standard",
      title: "Pass Conférences",
      price: "Gratuit",
      priceNote: "samedi 18 octobre",
      description:
        "La grande journée : keynote, 12+ sessions et la table ronde. Ouvert à tout le monde, du débutant au profil confirmé.",
      perks: [
        "Keynote d'ouverture DevFest 2025",
        "12+ sessions : IA, cybersécurité, IoT, startups",
        "Table ronde et sessions communauté",
        "Pause-café et espace networking",
        "Accès aux stands des partenaires",
      ],
    },
    {
      id: "workshop",
      variant: "pro",
      title: "Pass Ateliers",
      price: "Gratuit",
      priceNote: "samedi 25 octobre",
      description:
        "Une journée entièrement pratique, en petits groupes, sur 3 salles en parallèle. Inscription obligatoire : les places sont limitées par salle.",
      perks: [
        "3 ateliers pratiques au choix, en parallèle",
        "Gemini, Vertex AI et Google Workspace",
        "IA appliquée à la lutte contre la désinformation",
        "Communication digitale",
        "Encadrement par des Google Developer Experts",
      ],
    },
  ],

  tracks: [
    "IA & Gemini",
    "Android",
    "Web",
    "Google Cloud",
    "Firebase",
    "Flutter",
    "Google Workspace",
    "UX/UI Design",
    "AR / VR",
    "Accessibilité",
    "Cybersécurité",
    "IoT",
    "Startups",
    "Communauté",
  ],

  speakers: [
    {
      name: "Abdel Aziz Mfossa",
      role: "Lead GDG Yaoundé · Google Workspace Engineer",
      bio: "Lead de GDG Yaoundé et ingénieur Google Workspace. Il ouvre le DevFest avec la keynote et anime une session sur NotebookLM.",
      tags: ["IA & Gemini", "Google Workspace"],
      social: { x: "https://x.com/AbdelMfossa" },
    },
    {
      name: "Rev. Lee Jean",
      role: "Coordinateur National, IYF Cameroun",
      bio: "Coordinateur national de l'International Youth Fellowship au Cameroun. Il partage la mentalité de croissance qui a porté l'essor technologique de la Corée du Sud.",
      tags: ["Communauté"],
      social: {},
    },
    {
      name: "Edmond Makolle",
      role: "Co-Lead GDG Yaoundé · Back End Engineer",
      bio: "Co-lead de la communauté et ingénieur back-end. Il explique comment s'impliquer réellement dans les communautés tech et en tirer parti.",
      tags: ["Communauté"],
      social: {},
    },
    {
      name: "Cabrel Domfang",
      role: "Tech Evangelist · Social Media Manager GDG Yaoundé",
      bio: "Tech evangelist et responsable des réseaux de GDG Yaoundé. Sa session : faire de l'IA un levier plutôt qu'un remplaçant.",
      tags: ["IA & Gemini"],
      social: {},
    },
    {
      name: "Dilan Nde",
      role: "CEO, Nerala",
      bio: "Fondateur de Nerala. Il décortique l'architecture des grands modèles de langage modernes, sans jargon inutile.",
      tags: ["IA & Gemini"],
      social: {},
    },
    {
      name: "Yunwen Eric",
      role: "Founder, Togeva",
      bio: "Fondateur de Togeva. Il montre comment faire tourner de l'intelligence artificielle réellement hors ligne, sur l'appareil.",
      tags: ["IA & Gemini", "Android"],
      social: {},
    },
    {
      name: "Le Prince Dachi",
      role: "Cybersecurity Engineer",
      bio: "Ingénieur en cybersécurité. Avec SecuDev, il passe en revue les réflexes concrets pour protéger vos applications.",
      tags: ["Cybersécurité"],
      social: {},
    },
    {
      name: "Steve Yonkeu",
      role: "Software Engineer",
      bio: "Ingénieur logiciel. Il explore le monde sans mot de passe : passkeys, WebAuthn et ce que ça change pour vos utilisateurs.",
      tags: ["Cybersécurité", "Web"],
      social: {},
    },
    {
      name: "Regine Felicia Mbassi",
      role: "Data Scientist Enthusiast",
      bio: "Passionnée de data science. Elle croise IoT et IA pour montrer comment l'innovation devient un vrai levier commercial.",
      tags: ["IoT", "IA & Gemini"],
      social: {},
    },
    {
      name: "Yuven Carlson",
      role: "CTO, Crestlancing Ltd",
      bio: "CTO de Crestlancing. De l'idée au produit : construire une startup dans un marché émergent, sans romantisme.",
      tags: ["Startups"],
      social: {},
    },
    {
      name: "Cyprien Tankeu",
      role: "Google Developer Expert, Google Workspace",
      bio: "Google Developer Expert et mentor de GDG Yaoundé. Atelier pratique : analyse de sentiments dans Gmail avec Gemini et Vertex AI.",
      tags: ["Google Workspace", "IA & Gemini"],
      social: {},
    },
    {
      name: "Vanessa Manessong",
      role: "Investigative Data Analyst",
      bio: "Analyste de données d'investigation. Son atelier : utiliser l'IA dans la lutte contre la désinformation.",
      tags: ["IA & Gemini"],
      social: {},
    },
    {
      name: "Emmanuel Zebaze",
      role: "Responsable Marketing Digital",
      bio: "Responsable marketing digital. Il anime l'atelier consacré à la communication digitale pour les projets tech.",
      tags: ["Communauté"],
      social: {},
    },
    {
      name: "Murielle Kemwa",
      role: "WTM Ambassador, GDG Yaoundé",
      bio: "Ambassadrice Women Techmakers et organisatrice de GDG Yaoundé. Elle porte les sessions et initiatives WTM du DevFest.",
      tags: ["Communauté"],
      social: {},
    },
  ],

  /**
   * Programme. Les horaires détaillés par session n'ont pas été publiés :
   * on affiche la plage de la journée et l'ordre de passage plutôt que
   * d'inventer des créneaux.
   */
  schedule: [
    {
      id: "jour-1",
      tabDay: "Sam 18",
      tabLabel: "Conférences",
      date: "Samedi 18 octobre 2025",
      window: "07:30 – 15:30",
      title: "TALKS & TABLE RONDE",
      description:
        "La grande journée du DevFest : keynote, sessions techniques et table ronde, à l'IYF Center de Mvog-Bi.",
      venue: "IYF-Cameroon Center, N2, Mvog-Bi (près de la perception de Yaoundé 4), Yaoundé",
      sessions: [
        { title: "Accueil et check-in", speaker: null, room: "Hall", type: "logistics" },
        { title: "Keynote DevFest 2025", speaker: "Abdel Aziz Mfossa", room: "Grande salle", type: "keynote" },
        {
          title: "Mind Education : la mentalité de la croissance technologique de la Corée du Sud",
          speaker: "Rev. Lee Jean",
          room: "Grande salle",
        },
        { title: "Getting Involved in Tech Communities", speaker: "Edmond Makolle", room: "Grande salle" },
        { title: "Let AI empower you, not replace you", speaker: "Cabrel Domfang", room: "Grande salle" },
        { title: "Pause-café et réseautage", speaker: null, room: "Espace networking", type: "break" },
        {
          title: "Know Your LLM : a high level overview of modern LLM's architecture",
          speaker: "Dilan Nde",
          room: "Grande salle",
        },
        { title: "NotebookLM and the Future of Knowledge", speaker: "Abdel Aziz Mfossa", room: "Grande salle" },
        { title: "On-Device Intelligence : making AI truly offline", speaker: "Yunwen Eric", room: "Grande salle" },
        { title: "SecuDev : protégez vos applications", speaker: "Le Prince Dachi", room: "Grande salle" },
        { title: "Living In A Passwordless World", speaker: "Steve Yonkeu", room: "Grande salle" },
        {
          title: "IoT & AI : drive innovation for commercial purposes",
          speaker: "Regine Felicia Mbassi",
          room: "Grande salle",
        },
        {
          title: "From Idea to Product : building startups in emerging markets",
          speaker: "Yuven Carlson",
          room: "Grande salle",
        },
      ],
    },
    {
      id: "jour-2",
      tabDay: "Sam 25",
      tabLabel: "Ateliers",
      date: "Samedi 25 octobre 2025",
      window: "07:30 – 15:30",
      title: "HANDS-ON WORKSHOPS",
      description:
        "Trois ateliers pratiques en parallèle, au campus de l'Université de Yaoundé I (CUTI). On code, on manipule, on repart avec quelque chose qui tourne.",
      venue: "Campus Université de Yaoundé I (CUTI), Yaoundé",
      sessions: [
        {
          title: "Analyse des sentiments dans Gmail avec Gemini et Vertex AI",
          speaker: "Cyprien Tankeu",
          room: "Salle 1",
          type: "workshop",
        },
        {
          title: "L'IA dans la lutte contre la désinformation",
          speaker: "Vanessa Manessong",
          room: "Salle 2",
          type: "workshop",
        },
        {
          title: "La communication digitale",
          speaker: "Emmanuel Zebaze",
          room: "Salle 3",
          type: "workshop",
        },
      ],
    },
  ],

  team: [
    { name: "Abdel Aziz Mfossa", role: "Lead", org: "Université de Yaoundé I" },
    { name: "Edmond Makolle", role: "Co-Lead", org: "GDG Yaoundé" },
    { name: "Murielle Kemwa", role: "Organisatrice", org: "GDG Yaoundé" },
    { name: "Joël Fah", role: "Designer", org: "GDG Yaoundé" },
    { name: "Jerry Ndjana", role: "Organisateur", org: "GDG Yaoundé" },
    { name: "Cabrel Domfang", role: "Social Media Manager", org: "GDG Yaoundé" },
    { name: "Nathanael Foka", role: "Organisateur", org: "GDG Yaoundé" },
    { name: "Maxime Etoundi", role: "Organisateur", org: "GDG Yaoundé" },
    { name: "Grace Divine Tchuenteu Ebe'ete", role: "Ambassadrice WTM", org: "Women Techmakers" },
    { name: "Cyprien Tankeu", role: "Mentor", org: "Google Developer Expert" },
  ],

  partners: {
    current: [{ name: "Coding Industry", tier: "Partenaire 2025" }],
    past: [
      { name: "Kaeyros Analytics" },
      { name: "Coding Industry" },
      { name: "YIBS" },
      { name: "Direct" },
      { name: "CCN Technologies" },
    ],
  },

  /** Éditions précédentes recensées sur gdg.community.dev */
  pastEditions: ["2018", "2021", "2022", "2023", "2024"],

  /** Autres rendez-vous de la communauté (hors DevFest) */
  otherEvents: [
    { name: "Build with AI Yaoundé", note: "Google Antigravity & déploiement Google Cloud" },
    { name: "I/O Extended Yaoundé", note: "Les annonces de Google I/O, relayées localement" },
    { name: "The Helpckaton: Break The Pattern", note: "Hackathon communautaire" },
    { name: "Deep Dive into Well-Architected Mindset", note: "Session architecture cloud" },
  ],

  faqs: [
    {
      q: "C'est quoi un DevFest ?",
      a: "Le DevFest est une conférence développeurs organisée chaque année par les Google Developer Groups (GDG) partout dans le monde. Elle réunit passionnés de tech, développeurs et experts de l'industrie autour du partage de connaissances, d'expériences et d'innovation.",
    },
    {
      q: "C'est quoi le DevFest Yaoundé 2025 ?",
      a: "C'est le plus grand événement Google Developer Group de la ville de Yaoundé : une expérience de deux journées dédiée à l'innovation, à l'apprentissage et à la communauté. 2025 marque la 12e année de DevFest et l'entrée de la communauté GDG dans sa deuxième décennie.",
    },
    {
      q: "Quand et où se déroule l'événement ?",
      a: "Le samedi 18 octobre 2025 pour les conférences et la table ronde, à l'IYF-Cameroon Center (N2, Mvog-Bi, près de la perception de Yaoundé 4). Puis le samedi 25 octobre 2025 pour les ateliers pratiques, au campus de l'Université de Yaoundé I (CUTI). Les deux journées se tiennent de 07:30 à 15:30.",
    },
    {
      q: "Combien ça coûte ?",
      a: "Rien. La participation au DevFest Yaoundé est entièrement gratuite, les deux journées comprises. Il suffit de confirmer sa présence (RSVP) sur la page de l'événement.",
    },
    {
      q: "À quoi dois-je m'attendre ?",
      a: "Une keynote d'ouverture, plus de 12 sessions couvrant l'IA, la cybersécurité, l'IoT et les startups, une table ronde, une pause-café pensée pour le réseautage — puis, la semaine suivante, trois ateliers pratiques en parallèle sur Gemini et Vertex AI, l'IA face à la désinformation et la communication digitale.",
    },
    {
      q: "Faut-il être développeur pour venir ?",
      a: "Non. Les sessions vont du débutant au profil confirmé, et les thématiques couvrent aussi le design, le produit, la communication et l'entrepreneuriat. Étudiants, designers, product managers et curieux sont les bienvenus.",
    },
    {
      q: "Comment rejoindre la communauté GDG Yaoundé ?",
      a: "GDG Yaoundé compte plus de 1 900 membres. Rejoignez le chapitre sur gdg.community.dev/gdg-yaounde pour être notifié de tous les événements, et la communauté WhatsApp pour les échanges au quotidien.",
    },
    {
      q: "Comment devenir speaker ou partenaire ?",
      a: "Les appels à conférenciers sont ouverts chaque année en amont du DevFest via Sessionize, et annoncés sur les réseaux de GDG Yaoundé. Pour un partenariat, écrivez à l'équipe organisatrice via la page du chapitre.",
    },
  ],
};
