import { builders } from './builders';

const B = builders('biology', 'bio');
const C = builders('chemistry', 'chem');
const E = builders('english', 'eng');
const I = builders('informatics', 'inf');

export const BIOLOGY_QUESTIONS = [
  B.single('bio-cell', 'easy', 'Какой органоид называют «энергетической станцией» клетки?', ['Рибосома', 'Митохондрия', 'Аппарат Гольджи', 'Лизосома'], 1, 'В митохондриях происходит клеточное дыхание и синтез АТФ.'),
  B.bool('bio-cell', 'easy', 'Фотосинтез у растений происходит в хлоропластах.', true, 'Хлоропласты содержат хлорофилл, в них протекают световые и темновые реакции фотосинтеза.'),
  B.single('bio-genetics', 'medium', 'Каково соотношение фенотипов в потомстве при скрещивании Aa × Aa (полное доминирование)?', ['1 : 1', '3 : 1', '1 : 2 : 1', '9 : 3 : 3 : 1'], 1, 'Генотипы AA : 2Aa : aa. При полном доминировании фенотипы: 3 доминантных : 1 рецессивный.'),
  B.numeric('bio-genetics', 'easy', 'Сколько хромосом содержится в соматических клетках человека?', 46, 'Диплоидный набор человека — 46 хромосом (23 пары).'),
  B.single('bio-human', 'easy', 'Какие клетки крови переносят кислород?', ['Лейкоциты', 'Тромбоциты', 'Эритроциты', 'Лимфоциты'], 2, 'Эритроциты содержат гемоглобин, который связывает кислород.'),
  B.numeric('bio-ecology', 'medium', 'Продуценты экосистемы накопили 10 000 кДж энергии. Сколько энергии (кДж) получат консументы второго порядка по правилу 10%?', 100, 'Консументы I порядка: 1000 кДж, консументы II порядка: 100 кДж.'),
  B.multiple('bio-cell', 'medium', 'Какие структуры есть в растительной клетке, но отсутствуют в животной?', ['Хлоропласты', 'Митохондрии', 'Клеточная стенка из целлюлозы', 'Рибосомы'], [0, 2], 'Митохондрии и рибосомы есть в обеих клетках. Хлоропласты и целлюлозная стенка — признаки растительной клетки.'),
  B.single('bio-genetics', 'medium', 'Какой нуклеотид комплементарен аденину в молекуле ДНК?', ['Гуанин', 'Цитозин', 'Тимин', 'Урацил'], 2, 'В ДНК аденин образует пару с тимином (A–T), гуанин — с цитозином (G–C).'),
];

export const CHEMISTRY_QUESTIONS = [
  C.numeric('chem-general', 'easy', 'Каков порядковый номер кислорода в периодической системе?', 8, 'Кислород O — элемент №8, в ядре 8 протонов.'),
  C.numeric('chem-calc', 'easy', 'Найдите молярную массу воды H₂O (г/моль).', 18, 'M = 2·1 + 16 = 18 г/моль.', { unit: 'г/моль' }),
  C.numeric('chem-calc', 'medium', 'Какое количество вещества (моль) содержится в 44 г углекислого газа CO₂?', 1, 'M(CO₂) = 12 + 32 = 44 г/моль; n = m/M = 1 моль.', { unit: 'моль' }),
  C.numeric('chem-calc', 'medium', 'В 180 г воды растворили 20 г соли. Найдите массовую долю соли в растворе (%).', 10, 'ω = 20 / (180 + 20) = 0,1 = 10%.', { unit: '%' }),
  C.single('chem-general', 'easy', 'Какой тип химической связи в хлориде натрия NaCl?', ['Ковалентная неполярная', 'Ковалентная полярная', 'Ионная', 'Металлическая'], 2, 'NaCl образован типичным металлом и неметаллом — связь ионная.'),
  C.single('chem-organic', 'medium', 'Какова общая формула алканов?', ['CₙH₂ₙ', 'CₙH₂ₙ₊₂', 'CₙH₂ₙ₋₂', 'CₙH₂ₙ₋₆'], 1, 'Алканы — предельные углеводороды с общей формулой CₙH₂ₙ₊₂.'),
  C.multiple('chem-inorganic', 'medium', 'Выберите кислоты.', ['HCl', 'NaOH', 'H₂SO₄', 'KNO₃'], [0, 2], 'HCl и H₂SO₄ — кислоты. NaOH — основание (щёлочь), KNO₃ — соль.'),
  C.bool('chem-general', 'easy', 'Неон относится к благородным (инертным) газам.', true, 'Неон — элемент VIIIA группы, благородный газ.'),
];

export const ENGLISH_QUESTIONS = [
  E.single('eng-grammar', 'medium', 'If I ___ rich, I would travel around the world.', ['am', 'were', 'will be', 'have been'], 1, 'Second Conditional: If + Past Simple (were для всех лиц), … would + V.'),
  E.single('eng-grammar', 'easy', 'She has lived in Almaty ___ 2015.', ['for', 'since', 'from', 'during'], 1, 'С Present Perfect для точки отсчёта используется since; for — для промежутка времени.'),
  E.single('eng-grammar', 'medium', 'The letter ___ yesterday.', ['wrote', 'was written', 'has written', 'is writing'], 1, 'Passive Voice в Past Simple: was/were + V3.'),
  E.single('eng-vocabulary', 'easy', 'What does the phrasal verb "give up" mean?', ['to stop doing something', 'to give a present', 'to stand up', 'to return something'], 0, '"Give up" — бросить, перестать что-либо делать.'),
  E.single('eng-vocabulary', 'medium', 'Her ___ surprised everyone. (kind)', ['kindly', 'kindness', 'unkind', 'kinder'], 1, 'После притяжательного местоимения нужно существительное: kindness.'),
  E.single('eng-grammar', 'hard', 'By the time we arrived, the film ___.', ['started', 'has started', 'had started', 'was starting'], 2, 'Действие, завершённое до другого действия в прошлом, — Past Perfect: had started.'),
  E.bool('eng-vocabulary', 'easy', '"Look after" means "to take care of".', true, '"Look after" — заботиться, присматривать.'),
  E.multiple('eng-grammar', 'medium', 'Choose the irregular verbs.', ['go', 'play', 'write', 'watch'], [0, 2], 'go — went — gone, write — wrote — written; play и watch — правильные глаголы.'),
];

export const INFORMATICS_QUESTIONS = [
  I.numeric('inf-numbers', 'easy', 'Переведите число 1011₂ в десятичную систему счисления.', 11, '1·8 + 0·4 + 1·2 + 1·1 = 11.'),
  I.single('inf-numbers', 'medium', 'Как записывается десятичное число 255 в шестнадцатеричной системе?', ['FE', 'FF', '100', 'EF'], 1, '255 = 15·16 + 15 = FF₁₆.'),
  I.numeric('inf-logic', 'easy', 'Сколько байт содержится в 2 Кбайт?', 2048, '1 Кбайт = 1024 байта, 2 Кбайт = 2048 байт.'),
  I.bool('inf-logic', 'medium', 'Значение логического выражения (1 ИЛИ 0) И (НЕ 0) равно 1.', true, '1 ИЛИ 0 = 1; НЕ 0 = 1; 1 И 1 = 1.'),
  I.numeric('inf-algorithms', 'easy', 'Чему будет равно s после выполнения: s = 0; для i от 1 до 5: s = s + i?', 15, '1 + 2 + 3 + 4 + 5 = 15.'),
  I.single('inf-algorithms', 'medium', 'Какова временная сложность двоичного поиска в отсортированном массиве из n элементов?', ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], 1, 'На каждом шаге область поиска сокращается вдвое — O(log n).'),
  I.numeric('inf-logic', 'medium', 'Сколько различных значений можно закодировать с помощью 5 бит?', 32, '2⁵ = 32.'),
  I.multiple('inf-algorithms', 'easy', 'Какие из перечисленных являются языками программирования?', ['Python', 'HTML', 'C++', 'Excel'], [0, 2], 'Python и C++ — языки программирования. HTML — язык разметки, Excel — табличный процессор.'),
];
