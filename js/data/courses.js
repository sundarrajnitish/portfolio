/* Every course from the B.Tech (SRMIST, 2018–22) and the M.Eng (Concordia, 2022–25), grouped into the layers
 * of an engineering stack, bottom (physical) to top (digital). Course titles are kept as officially named.
 * `related` ties each project on the page to the coursework behind it; the layers' project links are derived from it. */
window.CURRICULUM = (function () {
  'use strict';
  const terms = {
    y1: { en: 'Year 1 · 2018–19', fr: '1re année · 2018–19', school: 'srm' },
    y2: { en: 'Year 2 · 2019–20', fr: '2e année · 2019–20', school: 'srm' },
    y3: { en: 'Year 3 · 2020–21', fr: '3e année · 2020–21', school: 'srm' },
    y4: { en: 'Year 4 · 2021–22', fr: '4e année · 2021–22', school: 'srm' },
    cu: { en: 'M.Eng · 2022–25', fr: 'M.Ing · 2022–25', school: 'cu' },
  };
  const schools = {
    srm: { name: 'SRMIST', en: 'B.Tech, Mechatronics', fr: 'B.Tech, mécatronique' },
    cu: { name: 'Concordia', en: 'M.Eng, Electrical & Computer', fr: 'M.Ing, génie électrique et informatique' },
  };

  const layers = [
    {
      id: 'math', color: '#ff6b6b',
      en: 'Math & Physical Science', fr: 'Mathématiques et sciences',
      blurbEn: 'Calculus through complex analysis, transforms, numerical methods and statistics, plus physics from electromagnetism to quantum mechanics.',
      blurbFr: 'Du calcul différentiel à l’analyse complexe, transformées, méthodes numériques et statistiques, et la physique de l’électromagnétisme à la mécanique quantique.',
      courses: [
        ['Calculus and Linear Algebra', 'y1'], ['Advanced Calculus and Complex Analysis', 'y1'],
        ['Physics: Electromagnetic Theory, Quantum Mechanics, Waves and Optics', 'y1'], ['Chemistry', 'y1'],
        ['Transforms and Boundary Value Problems', 'y2'], ['Numerical Methods for Engineers', 'y2'], ['Biology', 'y2'],
        ['Probability and Statistics', 'y3'],
      ],
    },
    {
      id: 'mech', color: '#ff8a3d',
      en: 'Mechanics & Making', fr: 'Mécanique et fabrication',
      blurbEn: 'Drawing, machining and the physics of things that move: solids, fluids, heat, mechanisms and machine design.',
      blurbFr: 'Dessin, usinage et physique de ce qui bouge : solides, fluides, chaleur, mécanismes et conception de machines.',
      courses: [
        ['Engineering Graphics and Design', 'y1'], ['Civil and Mechanical Engineering Workshop', 'y1'],
        ['Thermodynamics and Heat Transfer', 'y2'], ['Mechanics of Solids and Fluids', 'y2'],
        ['Kinematics and Dynamics of Rigid Bodies and Mechanisms', 'y2'], ['Fluid Power System and Automation', 'y2'],
        ['Machine Design', 'y3'], ['Manufacturing Processes', 'y4'],
      ],
    },
    {
      id: 'power', color: '#ffb020',
      en: 'Circuits & Power', fr: 'Circuits et énergie',
      blurbEn: 'Devices, machines, power electronics and drives. This is the layer I work in every day.',
      blurbFr: 'Composants, machines, électronique de puissance et entraînements. C’est la couche où je travaille chaque jour.',
      courses: [
        ['Basic Electrical and Electronics Engineering', 'y1'], ['Electrical Machines and Actuators', 'y2'],
        ['Solid State Devices and Circuits', 'y2'], ['Electrical and Electronics Laboratory', 'y2'],
        ['Power Electronics and Drives', 'y3'], ['Sustainable Energy', 'y4'],
      ],
    },
    {
      id: 'control', color: '#e3d633',
      en: 'Sensing & Control', fr: 'Capteurs et commande',
      blurbEn: 'Modelling dynamic systems, closing the loop around them, and conditioning the signals that feed the loop.',
      blurbFr: 'Modéliser des systèmes dynamiques, boucler la commande autour d’eux et conditionner les signaux qui l’alimentent.',
      courses: [
        ['System Dynamics', 'y2'], ['Linear and Digital Control Systems', 'y3'], ['Sensors and Signal Conditioning', 'y3'],
        ['Smart Sensor Systems', 'y3'], ['Micro Electro Mechanical Systems', 'y3'],
      ],
    },
    {
      id: 'embedded', color: '#a3e635',
      en: 'Embedded & Mechatronics', fr: 'Embarqué et mécatronique',
      blurbEn: 'Microcontrollers, and the craft of integrating mechanics, electronics and firmware into one working product.',
      blurbFr: 'Microcontrôleurs, et l’art d’intégrer mécanique, électronique et micrologiciel en un seul produit qui fonctionne.',
      courses: [
        ['Microcontrollers and Embedded System', 'y3'], ['Elements of Mechatronics Systems', 'y3'],
        ['Applied Mechatronics Systems', 'y4'], ['Design of Mechatronics Systems', 'y4'],
      ],
    },
    {
      id: 'silicon', color: '#34d399',
      en: 'Digital Hardware & Verification', fr: 'Matériel numérique et vérification',
      blurbEn: 'From logic gates to a pipelined CPU, then proving the hardware correct with simulation and formal methods.',
      blurbFr: 'Des portes logiques à un processeur en pipeline, puis la preuve que le matériel est correct, par simulation et méthodes formelles.',
      courses: [
        ['Digital Systems and Microprocessors', 'y2'], ['Computer Architecture and Design', 'cu'],
        ['Digital System Design and Synthesis', 'cu'], ['Functional Hardware Verification', 'cu'], ['Formal Hardware Verification', 'cu'],
      ],
    },
    {
      id: 'robotics', color: '#22d3ee',
      en: 'Robotics & Autonomy', fr: 'Robotique et autonomie',
      blurbEn: 'Manipulator mechanics, localising mobile robots, and automating industrial systems.',
      blurbFr: 'Mécanique des manipulateurs, localisation de robots mobiles et automatisation de systèmes industriels.',
      courses: [
        ['Fundamentals of Robotics', 'y3'], ['Automation and Intelligent Systems', 'y3'],
        ['Robotic Manipulators 1: Mechanics', 'cu'], ['Autonomy for Mobile Robots', 'cu'],
      ],
    },
    {
      id: 'data', color: '#60a5fa',
      en: 'Vision, Learning & Data', fr: 'Vision, apprentissage et données',
      blurbEn: 'Image processing, neural networks and data analysis with open-source tools.',
      blurbFr: 'Traitement d’images, réseaux de neurones et analyse de données avec des outils libres.',
      courses: [
        ['Data Analysis Using Open Source Tool', 'y3'], ['Machine Vision and Image Processing', 'y4'], ['Neural Networks', 'cu'],
      ],
    },
    {
      id: 'cloud', color: '#a78bfa',
      en: 'Software & Cloud', fr: 'Logiciel et infonuagique',
      blurbEn: 'From a first programming course to software engineering practice, cloud programming and network service provisioning.',
      blurbFr: 'D’un premier cours de programmation au génie logiciel, à la programmation infonuagique et au provisionnement de services réseau.',
      courses: [
        ['Programming for Problem Solving', 'y1'], ['Software Engineering', 'cu'], ['Programming on the Cloud', 'cu'],
        ['Cloud Networking and Service Provisioning', 'cu'],
      ],
    },
  ];

  const people = {
    id: 'people', color: '#f5f5f7',
    en: 'People & Practice', fr: 'Humain et pratique',
    blurbEn: 'Languages, management, ethics, communication and critical thinking: the platform every other layer stands on. Day to day, it shows up as working in English and French with clients, contractors and site teams.',
    blurbFr: 'Langues, gestion, éthique, communication et pensée critique : la base sur laquelle reposent toutes les autres couches. Au quotidien, cela se traduit par un travail en anglais et en français avec les clients, les entrepreneurs et les équipes de chantier.',
    courses: [
      ['English', 'y1'], ['French', 'y1'], ['Value Education', 'y1'], ['Professional Skills and Practices', 'y1'], ['General Aptitude', 'y1'],
      ['Constitution of India', 'y1'], ['Physical and Mental Health Using Yoga', 'y1'], ['NSO', 'y1'],
      ['Social Engineering', 'y2'], ['Competencies in Social Skills', 'y2'], ['Environmental Science', 'y2'],
      ['Management Principles for Engineers', 'y2'], ['Critical and Creative Thinking Skills', 'y2'],
      ['Massive Open Online Course-I', 'y3'], ['Analytical and Logical Thinking Skills', 'y3'], ['Indian Art Form', 'y3'],
      ['Employability Skills and Practices', 'y3'], ['Comprehension', 'y3'], ['Indian Traditional Knowledge', 'y3'],
      ['Seminar - II', 'y3'], ['Competitive Professional Skills', 'y3'],
    ],
  };

  // project anchor -> [short name, related coursework]
  const related = {
    'p-scada': ['EPMS · SCADA', ['Electrical Machines and Actuators', 'Power Electronics and Drives', 'Automation and Intelligent Systems', 'Linear and Digital Control Systems']],
    'p-f1': ['F1 CAN Telemetry', ['Data Analysis Using Open Source Tool', 'Microcontrollers and Embedded System', 'Sensors and Signal Conditioning']],
    'p-auction': ['AuctionHub', ['Cloud Networking and Service Provisioning', 'Programming on the Cloud']],
    'p-softhub': ['SoftHub', ['Programming on the Cloud', 'Software Engineering']],
    'p-dds': ['DDS Synthesizer', ['Formal Hardware Verification', 'Digital System Design and Synthesis']],
    'p-calc': ['Calc1 & Calc3', ['Functional Hardware Verification']],
    'p-mcl': ['Monte Carlo Localization', ['Autonomy for Mobile Robots', 'Probability and Statistics']],
    'p-arith': ['Arithmetic Unit', ['Digital System Design and Synthesis', 'Digital Systems and Microprocessors']],
    'p-mips': ['mini-MIPS', ['Computer Architecture and Design', 'Digital System Design and Synthesis']],
    'p-crimson': ['Le Crimson', ['Software Engineering']],
    'p-rtmc': ['RTMC-HG', ['Machine Vision and Image Processing', 'Fundamentals of Robotics', 'Design of Mechatronics Systems', 'Engineering Graphics and Design']],
    'p-hydro': ['Hydroponinator', ['Linear and Digital Control Systems', 'Sensors and Signal Conditioning', 'Microcontrollers and Embedded System']],
    'p-farme': ['FARM-E', ['Elements of Mechatronics Systems', 'Microcontrollers and Embedded System', 'Kinematics and Dynamics of Rigid Bodies and Mechanisms']],
    'p-plotter': ['Handwriting-Machine', ['Digital Systems and Microprocessors', 'Engineering Graphics and Design']],
    'p-wheelchair': ['Bluetooth Wheelchair', ['Basic Electrical and Electronics Engineering', 'Programming for Problem Solving']],
  };

  // derive: course name -> layer id, and each layer's projects
  const layerOf = {};
  [...layers, people].forEach((L) => L.courses.forEach(([n]) => { layerOf[n] = L.id; }));
  [...layers, people].forEach((L) => {
    L.projects = Object.keys(related).filter((p) => related[p][1].some((c) => layerOf[c] === L.id));
  });
  Object.values(related).forEach(([, cs]) => cs.forEach((c) => { if (!layerOf[c]) console.warn('unknown course', c); }));

  const all = [...layers, people].flatMap((L) => L.courses);
  return { terms, schools, layers, people, related, layerOf, total: all.length, count: (s) => all.filter(([, y]) => terms[y].school === s).length };
})();
