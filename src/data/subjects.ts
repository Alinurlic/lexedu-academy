import type { ExamFormat, Subject, SubjectId, Taxonomy, Topic } from '@/types';

const t = (id: string, name: string, subtopics: string[], advice: string): Topic => ({ id, name, subtopics, advice });

export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Математика',
    short: 'Мат',
    icon: 'sigma',
    color: '#2a78d6',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('math-algebra', 'Алгебра', ['Степени и корни', 'Многочлены', 'Формулы сокращённого умножения'], 'повторить свойства степеней и формулы сокращённого умножения'),
      t('math-equations', 'Уравнения', ['Линейные', 'Квадратные', 'Теорема Виета', 'Показательные', 'Логарифмические'], 'повторить дискриминант, теорему Виета и проверку корней'),
      t('math-inequalities', 'Неравенства', ['Линейные', 'Квадратные', 'Метод интервалов'], 'отработать метод интервалов и смену знака при умножении на отрицательное число'),
      t('math-functions', 'Функции', ['Область определения', 'Производная', 'Монотонность', 'Экстремумы'], 'повторить таблицу производных и исследование функции'),
      t('math-trig', 'Тригонометрия', ['Значения функций', 'Формулы приведения', 'Тригонометрические уравнения'], 'выучить таблицу значений и основное тригонометрическое тождество'),
      t('math-geometry', 'Геометрия', ['Треугольники', 'Окружность', 'Площади', 'Стереометрия'], 'повторить теорему Пифагора, формулы площадей и объёмов'),
      t('math-probability', 'Вероятность', ['Классическая вероятность', 'Независимые события'], 'повторить формулу P = m/n и правило умножения вероятностей'),
      t('math-combinatorics', 'Комбинаторика', ['Перестановки', 'Размещения', 'Сочетания'], 'различать перестановки, размещения и сочетания'),
      t('math-sequences', 'Последовательности', ['Арифметическая прогрессия', 'Геометрическая прогрессия'], 'повторить формулы n-го члена и суммы прогрессий'),
    ],
  },
  {
    id: 'physics',
    name: 'Физика',
    short: 'Физ',
    icon: 'atom',
    color: '#eb6834',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('phys-kinematics', 'Кинематика', ['Равномерное движение', 'Равноускоренное движение', 'Свободное падение'], 'повторить уравнения равноускоренного движения'),
      t('phys-dynamics', 'Динамика', ['Законы Ньютона', 'Сила трения', 'Закон всемирного тяготения'], 'повторить законы Ньютона и разбор сил на рисунке'),
      t('phys-mechanics', 'Законы сохранения', ['Импульс', 'Работа и энергия', 'Мощность'], 'повторить закон сохранения энергии и импульса'),
      t('phys-thermo', 'Термодинамика', ['Газовые законы', 'Первый закон термодинамики', 'КПД'], 'повторить уравнение Менделеева–Клапейрона и КПД тепловой машины'),
      t('phys-electricity', 'Электричество', ['Закон Ома', 'Соединения проводников', 'Работа тока'], 'повторить закон Ома и правила последовательного/параллельного соединения'),
      t('phys-magnetism', 'Магнетизм', ['Сила Ампера', 'Сила Лоренца', 'Индукция'], 'повторить правило левой руки и закон электромагнитной индукции'),
      t('phys-optics', 'Оптика', ['Отражение', 'Преломление', 'Линзы'], 'повторить формулу тонкой линзы и закон преломления'),
      t('phys-oscillations', 'Колебания и волны', ['Маятники', 'Период и частота', 'Волны'], 'повторить формулы периода маятников и связь λ = v/ν'),
      t('phys-modern', 'Современная физика', ['Фотоэффект', 'Строение атома', 'Радиоактивность'], 'повторить уравнение Эйнштейна для фотоэффекта и виды распада'),
    ],
  },
  {
    id: 'history',
    name: 'История Казахстана',
    short: 'Ист',
    icon: 'landmark',
    color: '#1baf7a',
    kind: 'mandatory',
    track: 'ent',
    topics: [
      t('hist-ancient', 'Древняя история', ['Каменный век', 'Бронзовый век', 'Саки, усуни, кангюи'], 'повторить археологические культуры и ранние государства'),
      t('hist-medieval', 'Средневековье', ['Тюркские каганаты', 'Караханиды', 'Монгольский период'], 'повторить хронологию тюркских государств'),
      t('hist-khanate', 'Казахское ханство', ['Образование ханства', 'Ханы и бии', 'Джунгарское нашествие'], 'повторить ключевых ханов и даты XV–XVIII вв.'),
      t('hist-colonial', 'Колониальный период', ['Присоединение к России', 'Национально-освободительные восстания'], 'повторить восстания XIX века и их руководителей'),
      t('hist-soviet', 'Советский период', ['Алаш', 'Коллективизация', 'Великая Отечественная война'], 'повторить события 1917–1991 годов'),
      t('hist-independent', 'Независимый Казахстан', ['Независимость', 'Конституция', 'Столица'], 'повторить даты 1991–1997 годов и государственные символы'),
    ],
  },
  {
    id: 'geography',
    name: 'География',
    short: 'Гео',
    icon: 'globe',
    color: '#eda100',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('geo-cartography', 'Картография', ['Масштаб', 'Координаты', 'Часовые пояса'], 'повторить расчёты по масштабу и определение координат'),
      t('geo-lithosphere', 'Литосфера', ['Рельеф', 'Тектоника', 'Горные породы'], 'повторить строение Земли и формы рельефа'),
      t('geo-atmosphere', 'Атмосфера и климат', ['Климатические пояса', 'Давление', 'Ветры'], 'повторить изменение температуры с высотой и климатические пояса'),
      t('geo-hydrosphere', 'Гидросфера', ['Реки', 'Озёра', 'Мировой океан'], 'повторить крупнейшие реки и озёра Казахстана и мира'),
      t('geo-kazakhstan', 'География Казахстана', ['Природные зоны', 'Ресурсы', 'Регионы'], 'повторить физическую карту Казахстана'),
      t('geo-economic', 'Экономическая география', ['Население', 'Отрасли', 'Страны мира'], 'повторить показатели населения и размещение отраслей'),
    ],
  },
  {
    id: 'biology',
    name: 'Биология',
    short: 'Био',
    icon: 'leaf',
    color: '#008300',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('bio-cell', 'Клетка', ['Органоиды', 'Деление клетки'], 'повторить функции органоидов клетки'),
      t('bio-genetics', 'Генетика', ['Законы Менделя', 'ДНК и РНК'], 'отработать задачи на законы Менделя'),
      t('bio-plants', 'Ботаника', ['Строение растений', 'Отделы растений', 'Грибы и лишайники'], 'повторить строение и отделы растений'),
      t('bio-animals', 'Зоология', ['Беспозвоночные', 'Позвоночные', 'Классы животных'], 'повторить признаки типов и классов животных'),
      t('bio-human', 'Человек', ['Системы органов', 'Кровь'], 'повторить строение систем органов человека'),
      t('bio-ecology', 'Экология', ['Экосистемы', 'Цепи питания'], 'повторить правило 10% и типы взаимоотношений'),
    ],
  },
  {
    id: 'chemistry',
    name: 'Химия',
    short: 'Хим',
    icon: 'flask',
    color: '#e87ba4',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('chem-general', 'Общая химия', ['Строение атома', 'Периодический закон', 'Химическая связь'], 'повторить строение атома и периодическую систему'),
      t('chem-inorganic', 'Неорганическая химия', ['Классы соединений', 'Реакции'], 'повторить классы неорганических веществ'),
      t('chem-calc', 'Расчётные задачи', ['Количество вещества', 'Массовая доля'], 'повторить формулы n = m/M и ω = m(в-ва)/m(р-ра)'),
      t('chem-organic', 'Органическая химия', ['Углеводороды', 'Функциональные группы'], 'повторить гомологические ряды и функциональные группы'),
    ],
  },
  {
    id: 'reading',
    name: 'Грамотность чтения',
    short: 'Чтен',
    icon: 'book',
    color: '#6250d6',
    kind: 'mandatory',
    track: 'ent',
    topics: [
      t('read-main-idea', 'Основная мысль', ['Тема и идея текста', 'Заголовок'], 'тренироваться формулировать главную мысль одним предложением'),
      t('read-details', 'Детали текста', ['Факты', 'Поиск информации'], 'внимательно сверять формулировки вариантов с текстом'),
      t('read-inference', 'Выводы и интерпретация', ['Скрытый смысл', 'Позиция автора'], 'отличать то, что сказано в тексте, от домыслов'),
    ],
  },
  {
    id: 'mathlit',
    name: 'Математическая грамотность',
    short: 'МГ',
    icon: 'calculator',
    color: '#e34948',
    kind: 'mandatory',
    track: 'ent',
    topics: [
      t('ml-percent', 'Проценты и доли', ['Скидки', 'Проценты от числа', 'Пропорции'], 'повторить нахождение процента от числа и последовательные скидки'),
      t('ml-data', 'Работа с данными', ['Среднее', 'Медиана', 'Таблицы'], 'повторить среднее арифметическое и медиану'),
      t('ml-logic', 'Логика и практические задачи', ['Движение', 'Время', 'Логические задачи'], 'решать задачи по шагам и проверять единицы измерения'),
    ],
  },
  {
    id: 'english',
    name: 'Английский язык',
    short: 'Англ',
    icon: 'languages',
    color: '#2a78d6',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('eng-grammar', 'Grammar', ['Tenses', 'Conditionals', 'Passive Voice'], 'повторить времена группы Perfect и условные предложения'),
      t('eng-vocabulary', 'Vocabulary', ['Phrasal verbs', 'Word formation'], 'повторить фразовые глаголы и словообразование'),
    ],
  },
  {
    id: 'informatics',
    name: 'Информатика',
    short: 'Инф',
    icon: 'cpu',
    color: '#1baf7a',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('inf-numbers', 'Системы счисления', ['Двоичная', 'Шестнадцатеричная'], 'потренироваться переводить числа между системами счисления'),
      t('inf-algorithms', 'Алгоритмы', ['Циклы', 'Ветвления', 'Сложность'], 'отработать трассировку циклов на бумаге'),
      t('inf-logic', 'Логика и информация', ['Логические операции', 'Единицы информации'], 'повторить таблицы истинности и единицы измерения информации'),
    ],
  },
  {
    id: 'worldhistory',
    name: 'Всемирная история',
    short: 'ВИ',
    icon: 'landmark',
    color: '#eb6834',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('wh-ancient', 'Древний мир', ['Древний Восток', 'Греция', 'Рим'], 'повторить хронологию древних цивилизаций'),
      t('wh-medieval', 'Средние века', ['Феодализм', 'Крестовые походы', 'Возрождение'], 'повторить основные события V–XV веков'),
      t('wh-modern', 'Новое время', ['Великие географические открытия', 'Революции', 'Промышленный переворот'], 'повторить революции XVII–XIX веков'),
      t('wh-xx', 'XX век', ['Первая мировая война', 'Вторая мировая война', 'Холодная война'], 'повторить даты и итоги мировых войн'),
      t('wh-contemporary', 'Современность', ['Международные организации', 'Глобализация'], 'повторить создание ООН, ЕС и других организаций'),
    ],
  },
  {
    id: 'law',
    name: 'Основы права',
    short: 'Право',
    icon: 'scale',
    color: '#6250d6',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('law-theory', 'Теория права', ['Норма права', 'Источники права', 'Отрасли права'], 'повторить признаки и виды норм права'),
      t('law-constitution', 'Конституционное право', ['Конституция РК', 'Органы власти', 'Права человека'], 'повторить основы конституционного строя Казахстана'),
      t('law-civil', 'Гражданское и семейное право', ['Дееспособность', 'Договоры', 'Брак и семья'], 'повторить правоспособность, дееспособность и условия брака'),
      t('law-labor', 'Трудовое право', ['Трудовой договор', 'Рабочее время', 'Отпуск'], 'повторить нормы Трудового кодекса РК'),
      t('law-criminal', 'Уголовное и административное право', ['Преступление', 'Ответственность', 'Правонарушение'], 'повторить возраст ответственности и виды наказаний'),
    ],
  },
  {
    id: 'russian',
    name: 'Русский язык',
    short: 'РЯ',
    icon: 'languages',
    color: '#1baf7a',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('ru-orthography', 'Орфография', ['Приставки', 'Н и НН', 'Не с разными частями речи'], 'повторить правила правописания приставок и суффиксов'),
      t('ru-morphology', 'Морфология', ['Части речи', 'Причастие и деепричастие'], 'повторить признаки частей речи'),
      t('ru-syntax', 'Синтаксис и пунктуация', ['Сложное предложение', 'Обособление', 'Запятые'], 'повторить знаки препинания в сложном предложении'),
      t('ru-lexis', 'Лексика и фонетика', ['Синонимы', 'Антонимы', 'Фразеологизмы', 'Ударение'], 'повторить лексические понятия и нормы ударения'),
    ],
  },
  {
    id: 'ruslit',
    name: 'Русская литература',
    short: 'РЛ',
    icon: 'book',
    color: '#e87ba4',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('rl-xix', 'Литература XIX века', ['Пушкин', 'Лермонтов', 'Гоголь', 'Толстой', 'Достоевский'], 'повторить авторов, произведения и героев XIX века'),
      t('rl-xx', 'Литература XX века', ['Серебряный век', 'Булгаков', 'Шолохов'], 'повторить литературу XX века и её направления'),
      t('rl-theory', 'Теория литературы', ['Роды и жанры', 'Тропы', 'Стихотворные размеры'], 'повторить тропы и литературные жанры'),
    ],
  },
  {
    id: 'kazakh',
    name: 'Казахский язык',
    short: 'ҚТ',
    icon: 'languages',
    color: '#0ea5a4',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('kz-orthography', 'Емле (орфография)', ['Бірге және бөлек жазу', 'Бас әріп', 'Дефис'], 'повторить правила емле: слитное и раздельное написание, заглавные буквы'),
      t('kz-morphology', 'Сөз таптары (морфология)', ['Зат есім, сын есім', 'Етістік', 'Жалғау мен жұрнақ'], 'повторить части речи, окончания (жалғау) и суффиксы (жұрнақ)'),
      t('kz-syntax', 'Синтаксис және тыныс белгілері', ['Сөйлем мүшелері', 'Құрмалас сөйлем', 'Тыныс белгілері'], 'повторить члены предложения и виды сложных предложений'),
      t('kz-lexis', 'Лексика және фонетика', ['Синоним, антоним, омоним', 'Фразеологизмдер', 'Дыбыс және буын'], 'повторить лексику, фразеологизмы и фонетику'),
    ],
  },
  {
    id: 'kazlit',
    name: 'Казахская литература',
    short: 'ҚӘ',
    icon: 'book',
    color: '#c2410c',
    kind: 'profile',
    track: 'ent',
    topics: [
      t('kl-early', 'Ежелгі және хандық дәуір әдебиеті', ['Орхон-Енисей жазбалары', 'Жыраулар поэзиясы', 'Батырлар жыры'], 'повторить древнюю литературу, жырау и эпос'),
      t('kl-xix', 'XIX ғасыр әдебиеті', ['Абай', 'Ыбырай', 'Зар заман ақындары'], 'повторить Абая, Ыбырая и поэтов XIX века'),
      t('kl-xx', 'XX ғасыр әдебиеті', ['Алаш ақын-жазушылары', 'М. Әуезов', 'Кеңес және тәуелсіздік кезеңі'], 'повторить литературу Алаш и писателей XX века'),
      t('kl-theory', 'Әдебиет теориясы', ['Әдебиет тектері мен жанрлары', 'Көркемдегіш құралдар', 'Өлең құрылысы'], 'повторить жанры, тропы и стихосложение'),
    ],
  },
  // ---------- SAT ----------
  {
    id: 'sat-rw',
    name: 'SAT Reading & Writing',
    short: 'R&W',
    icon: 'book',
    color: '#2a78d6',
    kind: 'section',
    track: 'sat',
    topics: [
      t('sat-craft', 'Craft and Structure', ['Words in Context', 'Text Structure and Purpose'], 'читать предложение целиком и подбирать слово по точному смыслу'),
      t('sat-info', 'Information and Ideas', ['Central Ideas', 'Command of Evidence', 'Inferences'], 'искать в тексте прямое подтверждение ответа'),
      t('sat-conventions', 'Standard English Conventions', ['Boundaries', 'Form, Structure, and Sense'], 'повторить согласование подлежащего и сказуемого и пунктуацию'),
      t('sat-expression', 'Expression of Ideas', ['Transitions', 'Rhetorical Synthesis'], 'определять логическую связь между предложениями'),
    ],
  },
  {
    id: 'sat-math',
    name: 'SAT Math',
    short: 'Math',
    icon: 'sigma',
    color: '#eb6834',
    kind: 'section',
    track: 'sat',
    topics: [
      t('sat-algebra', 'Algebra', ['Linear equations', 'Systems', 'Linear functions'], 'отработать линейные уравнения и системы'),
      t('sat-advanced', 'Advanced Math', ['Quadratics', 'Exponential functions', 'Polynomials'], 'повторить вершину параболы и экспоненциальный рост'),
      t('sat-data', 'Problem-Solving and Data Analysis', ['Ratios and rates', 'Percentages', 'Statistics'], 'повторить проценты, пропорции и среднее/медиану'),
      t('sat-geometry', 'Geometry and Trigonometry', ['Area and volume', 'Right triangles', 'Circles'], 'повторить формулы площадей, объёмов и окружности'),
    ],
  },
  // ---------- IELTS ----------
  {
    id: 'ielts-listening',
    name: 'IELTS Listening',
    short: 'L',
    icon: 'headphones',
    color: '#1baf7a',
    kind: 'section',
    track: 'ielts',
    topics: [
      t('il-social', 'Parts 1–2: everyday situations', ['Form completion', 'Multiple choice'], 'записывать числа, имена и даты без ошибок'),
      t('il-academic', 'Parts 3–4: academic context', ['Discussion', 'Lecture notes'], 'следить за ключевыми словами-сигналами в лекции'),
    ],
  },
  {
    id: 'ielts-reading',
    name: 'IELTS Reading',
    short: 'R',
    icon: 'book',
    color: '#6250d6',
    kind: 'section',
    track: 'ielts',
    topics: [
      t('ir-tfng', 'True / False / Not Given', ['Factual statements'], 'различать «Not Given» и «False»'),
      t('ir-mcq', 'Multiple choice', ['Detail', 'Main idea'], 'проверять каждый вариант по тексту'),
      t('ir-completion', 'Sentence / summary completion', ['Gap filling'], 'соблюдать лимит слов и точное написание'),
    ],
  },
  {
    id: 'ielts-writing',
    name: 'IELTS Writing',
    short: 'W',
    icon: 'pen',
    color: '#eda100',
    kind: 'section',
    track: 'ielts',
    topics: [
      t('iw-task1', 'Task 1: visual data', ['Charts', 'Processes', 'Maps'], 'писать overview и сравнивать ключевые данные'),
      t('iw-task2', 'Task 2: essay', ['Opinion', 'Discussion', 'Problem–solution'], 'чётко формулировать позицию и развивать аргументы'),
    ],
  },
  {
    id: 'ielts-speaking',
    name: 'IELTS Speaking',
    short: 'S',
    icon: 'mic',
    color: '#e34948',
    kind: 'section',
    track: 'ielts',
    topics: [
      t('is-part1', 'Part 1: introduction', ['Familiar topics'], 'отвечать развёрнуто, 2–3 предложения'),
      t('is-part2', 'Part 2: long turn', ['Cue card'], 'использовать минуту подготовки и план'),
      t('is-part3', 'Part 3: discussion', ['Abstract ideas'], 'приводить причины, примеры и сравнения'),
    ],
  },
];

export const SUBJECT_MAP = Object.fromEntries(SUBJECTS.map((s) => [s.id, s])) as Record<SubjectId, Subject>;

export const TOPIC_MAP: Record<string, Topic & { subject: SubjectId }> = Object.fromEntries(
  SUBJECTS.flatMap((s) => s.topics.map((tp) => [tp.id, { ...tp, subject: s.id }])),
);

/** Исходный справочник — чтобы правки админ-панели можно было отменить. */
const BASE = SUBJECTS.map((s) => ({ id: s.id, name: s.name, topics: s.topics.map((t) => ({ ...t, subtopics: [...t.subtopics] })) }));

export const EMPTY_TAXONOMY: Taxonomy = { subjectNames: {}, topicEdits: {}, customTopics: [] };

/**
 * Применяет пользовательские правки справочника (названия предметов, правки и новые темы).
 * Изменяет общие объекты SUBJECTS / SUBJECT_MAP / TOPIC_MAP на месте, чтобы все модули видели актуальные данные.
 */
export function applyTaxonomy(t: Taxonomy = EMPTY_TAXONOMY) {
  for (const base of BASE) {
    const subj = SUBJECT_MAP[base.id];
    subj.name = t.subjectNames[base.id]?.trim() || base.name;
    const topics: Topic[] = base.topics.map((tp) => {
      const e = t.topicEdits[tp.id];
      return { ...tp, name: e?.name?.trim() || tp.name, subtopics: e?.subtopics ?? tp.subtopics, advice: e?.advice?.trim() || tp.advice };
    });
    for (const ct of t.customTopics.filter((c) => c.subject === base.id)) {
      const e = t.topicEdits[ct.id];
      topics.push({ id: ct.id, name: e?.name?.trim() || ct.name, subtopics: e?.subtopics ?? ct.subtopics, advice: e?.advice?.trim() || ct.advice });
    }
    subj.topics = topics;
  }
  for (const k of Object.keys(TOPIC_MAP)) delete TOPIC_MAP[k];
  for (const s of SUBJECTS) for (const tp of s.topics) TOPIC_MAP[tp.id] = { ...tp, subject: s.id };
}

export function isBuiltinTopic(id: string) {
  return BASE.some((b) => b.topics.some((t) => t.id === id));
}

/**
 * Формат ЕНТ по умолчанию: 5 блоков, 140 баллов, 240 минут.
 * Формат не зашит в код: его можно изменить в админ-панели, если структура экзамена поменяется.
 */
export const DEFAULT_EXAM_FORMAT: ExamFormat = {
  name: 'ЕНТ: 5 блоков, 140 баллов',
  totalMinutes: 240,
  updatedAt: '2026-01-01',
  blocks: [
    { key: 'history', label: 'История Казахстана', slot: 'fixed', subject: 'history', questions: 20, maxPoints: 20 },
    { key: 'mathlit', label: 'Математическая грамотность', slot: 'fixed', subject: 'mathlit', questions: 10, maxPoints: 10 },
    { key: 'reading', label: 'Грамотность чтения', slot: 'fixed', subject: 'reading', questions: 10, maxPoints: 10 },
    { key: 'profile1', label: 'Профильный предмет 1', slot: 'profile1', questions: 40, maxPoints: 50, composition: { single: 25, context: 5, matching: 5, multiple: 5 } },
    { key: 'profile2', label: 'Профильный предмет 2', slot: 'profile2', questions: 40, maxPoints: 50, composition: { single: 25, context: 5, matching: 5, multiple: 5 } },
  ],
};

export function formatMax(f: ExamFormat) {
  return f.blocks.reduce((s, b) => s + b.maxPoints, 0);
}

export const MANDATORY_SUBJECTS: SubjectId[] = ['history', 'mathlit', 'reading'];

/** Допустимые сочетания профильных предметов (упрощённый список для демо). */
/** Сочетания профильных предметов ЕНТ (основные, по перечню НЦТ; при изменении перечня правится здесь). */
export const PROFILE_COMBOS: [SubjectId, SubjectId][] = [
  ['math', 'physics'],
  ['math', 'informatics'],
  ['math', 'geography'],
  ['biology', 'chemistry'],
  ['biology', 'geography'],
  ['chemistry', 'physics'],
  ['geography', 'english'],
  ['worldhistory', 'english'],
  ['worldhistory', 'geography'],
  ['worldhistory', 'law'],
  ['russian', 'ruslit'],
  ['kazakh', 'kazlit'],
]

export const UNT_MAX = 140;

export const TRACKS: { id: import('@/types').Track; name: string; full: string; scale: string }[] = [
  { id: 'ent', name: 'ЕНТ', full: 'Единое национальное тестирование', scale: '0–140 баллов' },
  { id: 'sat', name: 'SAT', full: 'Digital SAT', scale: '400–1600' },
  { id: 'ielts', name: 'IELTS', full: 'IELTS Academic', scale: 'Band 0–9' },
];

export function subjectsOf(track: import('@/types').Track) {
  return SUBJECTS.filter((s) => s.track === track);
}

export function subjectName(id: SubjectId) {
  return SUBJECT_MAP[id]?.name ?? id;
}
export function topicName(id: string) {
  return TOPIC_MAP[id]?.name ?? id;
}
