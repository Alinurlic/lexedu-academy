#!/usr/bin/env python3
"""
Импорт открытого датасета KazMMLU (MBZUAI, лицензия CC BY-NC 4.0) в банк LexEdu.

Датасет: https://huggingface.co/datasets/MBZUAI/KazMMLU
Статья:  Togmanov et al., «KazMMLU: Evaluating Language Models on Kazakh, Russian,
         and Regional Knowledge of Kazakhstan», ACL 2025.
Первоисточники вопросов указаны в датасете (itest.kz, ymnik.kz) и сохраняются в sourceRef.

Использование:
  python3 scripts/import-kazmmlu.py <папка с CSV> src/data/questions/open

CSV — файлы test.csv русскоязычных школьных разделов, переименованные по имени раздела
(Biology.csv, Kazakh_History.csv, …). Скрипт:
  • переводит формулы LaTeX в обычную запись (x², √2, a/b), отбрасывает то, что не удалось перевести;
  • отбрасывает вопросы со ссылками на рисунки/таблицы и пунктуационные вопросы с потерянными тире;
  • распределяет вопросы по темам LexEdu (ключевые слова + годы для истории);
  • сохраняет ссылку на первоисточник и лицензию у каждого вопроса.
"""
import csv
import json
import os
import re
import sys

LICENSE = 'KazMMLU (MBZUAI), CC BY-NC 4.0'
DATASET = 'https://huggingface.co/datasets/MBZUAI/KazMMLU'

SUBJECTS = {
    'Biology': 'biology', 'Chemistry': 'chemistry', 'Geography': 'geography', 'Informatics': 'informatics',
    'Kazakh_History': 'history', 'Law': 'law', 'Math': 'math', 'Math_Literacy': 'mathlit', 'Physics': 'physics',
    'Russian_Language': 'russian', 'Russian_Literature': 'ruslit', 'World_History': 'worldhistory',
}

# ---------------------------------------------------------------- LaTeX → текст
SUP = str.maketrans('0123456789+-−n()xyab', '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻⁻ⁿ⁽⁾ˣʸᵃᵇ')
SUB = str.maketrans('0123456789+-()xn', '₀₁₂₃₄₅₆₇₈₉₊₋₍₎ₓₙ')
SYMBOLS = {
    r'\cdot': '·', r'\times': '×', r'\div': ':', r'\pi': 'π', r'\leq': '≤', r'\le': '≤', r'\geq': '≥', r'\ge': '≥',
    r'\neq': '≠', r'\ne': '≠', r'\infty': '∞', r'\pm': '±', r'\mp': '∓', r'\circ': '°', r'\angle': '∠', r'\triangle': '△',
    r'\in': '∈', r'\notin': '∉', r'\cup': '∪', r'\cap': '∩', r'\emptyset': '∅', r'\varnothing': '∅', r'\approx': '≈',
    r'\parallel': '∥', r'\perp': '⊥', r'\Rightarrow': '⇒', r'\rightarrow': '→', r'\to': '→', r'\leftrightarrow': '↔',
    r'\Leftrightarrow': '⇔', r'\sim': '~', r'\%': '%', r'\degree': '°', r'\ldots': '…', r'\dots': '…', r'\cdots': '…',
    r'\alpha': 'α', r'\beta': 'β', r'\gamma': 'γ', r'\delta': 'δ', r'\Delta': 'Δ', r'\varepsilon': 'ε', r'\epsilon': 'ε',
    r'\eta': 'η', r'\theta': 'θ', r'\lambda': 'λ', r'\mu': 'μ', r'\nu': 'ν', r'\rho': 'ρ', r'\sigma': 'σ', r'\Sigma': 'Σ',
    r'\tau': 'τ', r'\varphi': 'φ', r'\phi': 'φ', r'\omega': 'ω', r'\Omega': 'Ω', r'\xi': 'ξ', r'\psi': 'ψ',
    r'\sin': 'sin', r'\cos': 'cos', r'\tg': 'tg', r'\ctg': 'ctg', r'\tan': 'tg', r'\cot': 'ctg', r'\arcsin': 'arcsin',
    r'\arccos': 'arccos', r'\arctg': 'arctg', r'\log': 'log', r'\lg': 'lg', r'\ln': 'ln', r'\lim': 'lim', r'\max': 'max', r'\min': 'min',
    r'\left': '', r'\right': '', r'\displaystyle': '', r'\limits': '', r'\,': ' ', r'\;': ' ', r'\:': ' ', r'\!': '', r'\ ': ' ',
    r'\{': '{', r'\}': '}', r'\|': '‖', r'\quad': ' ', r'\qquad': ' ', r'\backslash': '∖',
}


def _group(s: str, i: int):
    """Возвращает (содержимое {...} или один символ, индекс после)."""
    while i < len(s) and s[i] == ' ':
        i += 1
    if i >= len(s):
        return '', i
    if s[i] == '{':
        depth, j = 0, i
        while j < len(s):
            if s[j] == '{':
                depth += 1
            elif s[j] == '}':
                depth -= 1
                if depth == 0:
                    return s[i + 1:j], j + 1
            j += 1
        raise ValueError('unbalanced')
    if s[i] == '\\':
        m = re.match(r'\\[a-zA-Z]+', s[i:])
        if m:
            return m.group(0), i + len(m.group(0))
    return s[i], i + 1


def _wrap(x: str) -> str:
    x = x.strip()
    return x if re.fullmatch(r'[\w.,°πα-ω√²³⁰-⁹]+', x) else f'({x})'


def latex(s: str) -> str:
    s = s.replace('\\(', '').replace('\\)', '').replace('\\[', '').replace('\\]', '').replace('$', '')
    out, i = [], 0
    while i < len(s):
        if s.startswith('\\frac', i) or s.startswith('\\dfrac', i) or s.startswith('\\tfrac', i):
            i = s.index('frac', i) + 4
            a, i = _group(s, i)
            b, i = _group(s, i)
            out.append(f'{_wrap(latex(a))}/{_wrap(latex(b))}')
        elif s.startswith('\\sqrt', i):
            i += 5
            deg = None
            if i < len(s) and s[i] == '[':
                j = s.index(']', i)
                deg, i = s[i + 1:j], j + 1
            a, i = _group(s, i)
            inner = latex(a)
            root = {'3': '∛', '4': '∜'}.get(deg or '', '√') if deg in (None, '3', '4') else f'{deg.translate(SUP)}√'
            out.append(root + _wrap(inner))
        elif s.startswith('\\text', i) or s.startswith('\\mathrm', i) or s.startswith('\\textbf', i) or s.startswith('\\mathbf', i) or s.startswith('\\operatorname', i):
            i = s.index('{', i)
            a, i = _group(s, i)
            out.append(latex(a))
        elif s.startswith('\\overline', i) or s.startswith('\\vec', i) or s.startswith('\\overrightarrow', i):
            m = re.match(r'\\[a-zA-Z]+', s[i:])
            i += len(m.group(0))
            a, i = _group(s, i)
            out.append(latex(a) + ('⃗' if 'vec' in m.group(0) or 'arrow' in m.group(0) else ''))
        elif s[i] in '^_':
            kind = s[i]
            a, i = _group(s, i + 1)
            t = latex(a).strip()
            if kind == '^' and t in ('°', '\\circ', 'o'):
                out.append('°')
                continue
            table = SUP if kind == '^' else SUB
            conv = t.translate(table)
            ok = all(c in '⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻ⁿ⁽⁾ˣʸᵃᵇ₀₁₂₃₄₅₆₇₈₉₊₋₍₎ₓₙ' for c in conv)
            out.append(conv if ok and conv else (f'^({t})' if kind == '^' else f'_{t}'))
        elif s[i] == '\\':
            m = re.match(r'\\([a-zA-Z]+|.)', s[i:])
            tok = m.group(0)
            if tok in SYMBOLS:
                out.append(SYMBOLS[tok])
                i += len(tok)
            else:
                raise ValueError('unknown ' + tok)
        elif s[i] in '{}':
            i += 1
        else:
            out.append(s[i])
            i += 1
    return re.sub(r'\s{2,}', ' ', ''.join(out)).strip()


def clean(s: str) -> str:
    s = (s or '').replace('\xa0', ' ').strip()
    if '\\' in s or '$' in s:
        s = latex(s)
    if '\\' in s:
        raise ValueError('latex left')
    return re.sub(r'\s+', ' ', s).strip()


# ---------------------------------------------------------------- темы
ROMAN = {'I': 1, 'V': 5, 'X': 10, 'L': 50}


def _roman(r: str) -> int:
    r = r.upper().replace('Х', 'X').replace('І', 'I')
    total = 0
    for i, ch in enumerate(r):
        v = ROMAN.get(ch, 0)
        total += -v if i + 1 < len(r) and ROMAN.get(r[i + 1], 0) > v else v
    return total


def years(text: str):
    """Годы (1847, 1756-1758) и века римскими цифрами (XIII в., III–IV вв. до н. э.) → оценка года."""
    ys = [int(y) for y in re.findall(r'(?<!\d)(1[0-9]{3}|20[0-2][0-9])(?!\d)', text)]
    for m in re.finditer(r'(?<![А-Яа-яA-Za-z])([IVXХ]{1,5})(?:\s*[-–]\s*([IVXХ]{1,5}))?\s*(?:вв?\.|век|веке|века|столети)', text):
        c = _roman(m.group(2) or m.group(1))
        if not 1 <= c <= 21:
            continue
        after = text[m.end():m.end() + 12]
        bc = re.match(r'\s*до\s*н', after)
        ys.append(-(c - 1) * 100 - 50 if bc else (c - 1) * 100 + 50)
    return ys


def topic_history(t: str) -> str:
    low = t.lower()
    if re.search(r'до н\.?\s?э|палеолит|неолит|энеолит|бронз|андронов|ботай|сак[иаов]|усун|кангю|гунн|скиф|курган|петроглиф|томирис|ширак|шырак|массагет|сармат|аланы|тасмолин', low):
        return 'hist-ancient'
    ys = [y for y in years(t) if y < 2030]
    if ys:
        y = max(ys)
        if y >= 1991:
            return 'hist-independent'
        if y >= 1917:
            return 'hist-soviet'
        if y >= 1782:
            return 'hist-colonial'
        if y >= 1450:
            return 'hist-khanate'
        if y >= 500:
            return 'hist-medieval'
        return 'hist-ancient'
    if re.search(r'независим|республик[аи] казахстан|конституц|президент|парламент|мажилис|сенат|астан|тенге|послани|закон[аеу]? «?о язык|суверенит', low):
        return 'hist-independent'
    if re.search(r'совет|ссср|алаш|коллективиз|индустриализ|целин|великой отечествен|репресс|казасср|кпсс|колхоз|совхоз|голод|ашаршылы|ленин|сталин|большевик|комсомол|гулаг|карлаг|депорт', low):
        return 'hist-soviet'
    if re.search(r'тюрк|каганат|караханид|монгол|чингис|золот|орд[аы]|огуз|кимак|кыпчак|карлук|тюргеш|отрар|ислам|фараби|ясави|арыстан|кашгари|баласагун|акыр|тараз|сыгнак|сауран|шелков', low):
        return 'hist-medieval'
    if re.search(r'восстан|царск|россий|генерал-губерн|уезд|волост|оренбург|переселен|кенесары|исатай|махамбет|абай|валиханов|уалиханов|алтынсарин|ыбырай|столыпин|степн[оы]е положени|временн[оы]е положени', low):
        return 'hist-colonial'
    if re.search(r'ханств|хан[аеуы]?\b|жуз|жүз|джунгар|жоңғар|бий|би\b|батыр|касым|тауке|абылай|есим|хакназар|керей|жанибек|тауекел', low):
        return 'hist-khanate'
    return 'hist-khanate'


KW = {
    'math': [
        ('math-probability', r'вероятн'), ('math-combinatorics', r'сколькими способами|перестановк|размещени|сочетани|комбинатор|\d!'),
        ('math-sequences', r'прогресси|последовательност'), ('math-trig', r'sin|cos|tg|ctg|тригонометр|arc'),
        ('math-functions', r'производн|функци|первообразн|интеграл|касательн|экстремум|возраста|убыва|∫|f\(x\)|f′|y\s*='),
        ('math-geometry', r'треугольник|окружност|круг|квадрат[а-я]* со сторон|ромб|трапеци|параллелограмм|угол|углы|площад|объ[её]м|призм|пирамид|цилиндр|конус|шар|куб|радиус|диаметр|вектор|прямоугольник|многоугольник|периметр|биссектрис|медиан|высот'),
        ('math-inequalities', r'неравенств|[<>≤≥]'), ('math-equations', r'уравнени|корн[иья] уравн|систем[ау] уравн'),
    ],
    'mathlit': [('ml-percent', r'%|процент|скидк|налог|ставк|кредит|депозит|доля'), ('ml-data', r'средн|медиан|мод[аы]|таблиц|диаграм|статист|опрос')],
    'physics': [
        ('phys-modern', r'фотоэффект|фотон|атом|ядр|радиоакт|изотоп|распад|квант|электрон[- ]?вольт|планк|альфа|бета|гамма-'),
        ('phys-optics', r'линз|преломлен|отражен|зеркал|свет|оптич|фокус|изображени|дифракц|интерференц'),
        ('phys-oscillations', r'колебан|маятник|период|частот|волн|звук|резонанс|гармонич'),
        ('phys-magnetism', r'магнит|индукц|индуктивн|ампера|лоренца|катушк|соленоид'),
        ('phys-electricity', r'\bток|напряжени|сопротивлен|заряд|конденсатор|электрическ|\bом\b|вольт|кулон|резистор|проводник'),
        ('phys-thermo', r'газ|температур|теплот|тепл|внутренн[яе][йя]? энерги|кпд|изобар|изохор|изотерм|кельвин|давлени|плавлен|кипени|испарен'),
        ('phys-mechanics', r'импульс|энерги|работ[аы]|мощност|закон сохранения'),
        ('phys-dynamics', r'сил[аыу]|ньютон|масс[аы]|трени|тяготени|вес|упругост|ускорени свободного'),
    ],
    'chemistry': [
        ('chem-calc', r'масс[аыу]|объ[её]м|моль|выход|массов[аяой]+ дол|концентрац|рассчитай|вычисли|сколько грамм|л \(н\.у\.\)|н\.у\.'),
        ('chem-organic', r'алкан|алкен|алкин|арен|бензол|спирт|альдегид|кетон|кислот[аы] карбон|карбонов|эфир|жир|углевод|белок|белк|аминокисл|изомер|гомолог|метан|этан|этилен|ацетилен|фенол|глюкоз|крахмал|целлюлоз|органическ|полимер|уксусн'),
        ('chem-general', r'электрон|орбитал|период|групп[аеы] период|атомн|ядр|изотоп|связ[ьи]|валентн|степен[ьи] окислен|электроотриц|кристаллическ|скорост[ьи] реакц|равновеси'),
    ],
    'biology': [
        ('bio-genetics', r'ген|наследств|хромосом|днк|рнк|мендел|аллел|генотип|фенотип|мутац|скрещиван|доминант|рецессив'),
        ('bio-cell', r'клетк|органоид|митохондр|хлоропласт|рибосом|ядро|мембран|митоз|мейоз|цитоплазм|фотосинтез|аденозин|атф|фермент'),
        ('bio-human', r'человек|кров|сердц|желуд|кишеч|почк|легк|нерв|мозг|гормон|железа|кост|мышц|иммун|витамин|органов чувств|глаз|кож[аи]|пищевар'),
        ('bio-ecology', r'эколог|экосистем|биоценоз|цеп[ьи] питан|популяц|биосфер|продуцент|консумент|редуцент|загрязн|охран|среда обитан|красн[ауо]+ книг'),
    ],
    'geography': [
        ('geo-kazakhstan', r'казахстан|алмат|астан|караганд|павлодар|атырау|актюбин|костанай|кызылорд|жамбыл|туркестан|балхаш|арал|каспий|ертіс|иртыш|сырдар|или\b|алтай|тянь-шань|сарыарк|мангыст|байконур|экибастуз'),
        ('geo-cartography', r'масштаб|координат|широт|долгот|азимут|меридиан|параллел|карт[аеуы]|часов[ыо]?[йе] пояс|горизонтал|глобус'),
        ('geo-atmosphere', r'климат|атмосфер|ветер|ветр|муссон|пассат|осадк|давлени|циклон|антициклон|температур|погод|воздух'),
        ('geo-hydrosphere', r'рек[аиу]|озер|океан|мор[ея]|течени|ледник|подземн[ыа]+ вод|водохранилищ|гидросфер|бассейн'),
        ('geo-lithosphere', r'рельеф|гор[аыу]|вулкан|землетрясен|литосфер|платформ|тектоническ|минерал|горн[ыа]+ пород|полезн[ыа]+ ископаем|равнин|почв'),
        ('geo-economic', r'населени|промышленн|сельск|хозяйств|экономик|транспорт|отрасл|экспорт|импорт|ввп|урбаниз|город|стран[аы]|государств'),
    ],
    'informatics': [
        ('inf-numbers', r'систем[аеуы] счислени|двоичн|восьмеричн|шестнадцатеричн|основани'),
        ('inf-algorithms', r'алгоритм|цикл|программ|while|for\b|if\b|массив|переменн|паскал|python|питон|функци|процедур'),
    ],
    'law': [
        ('law-criminal', r'уголовн|преступлен|наказани|административн|правонарушени|штраф|арест|лишени[ея] свобод'),
        ('law-labor', r'трудов|работник|работодател|отпуск|рабоч|заработн|увольнен'),
        ('law-civil', r'гражданск|дееспособн|правоспособн|договор|сделк|собственност|наследств|брак|семейн|супруг|алимент|опек'),
        ('law-constitution', r'конституц|президент|парламент|мажилис|сенат|правительств|акимат|маслихат|гражданств|выбор|референдум|суд[аы]? конституц'),
    ],
    'russian': [
        ('ru-syntax', r'предложени|подлежащ|сказуем|обособ|вводн|однородн|сложносочин|сложноподчин|бессоюзн|запят|обращени|словосочетани'),
        ('ru-morphology', r'част[ьи] речи|причасти|деепричасти|наречи|местоимени|числительн|прилагательн|глагол|существительн|склонени|спряжени|падеж|союз|предлог|частиц'),
        ('ru-lexis', r'синоним|антоним|омоним|пароним|фразеолог|ударени|звук|букв|лексическ|значени[ея] слова|устаревш|заимствован|фонетик'),
        ('ru-orthography', r'пишется|написани|орфограф|пропущен|слитно|раздельно|дефис|н и нн|не с|приставк|корн[ея]|чередован|гласн|согласн|окончани|суффикс'),
    ],
    'ruslit': [
        ('rl-theory', r'жанр|троп|метафор|эпитет|сравнени|олицетворени|гипербол|литот|аллегори|размер|ямб|хорей|дактил|анапест|амфибрахи|рифм|композиц|кульминац|завязк|развязк|род[ау]? литератур|лирическ|эпическ|драматическ|сатир|юмор|ирони|гротеск'),
        ('rl-xx', r'булгаков|шолохов|блок|есенин|маяковск|ахматов|цветаев|пастернак|горьк|бунин|куприн|платонов|солженицын|твардовск|паустовск|распутин|шукшин|астафьев|серебрян|айтматов|набоков|зощенко|гумил[её]в|мандельштам|фадеев|пришвин'),
        ('rl-xix', r'пушкин|лермонтов|гогол|толст|достоевск|тургенев|чехов|некрасов|островск|гончаров|салтыков|тютчев|фет|грибоедов|крылов|жуковск|карамзин|лесков|онегин|печорин|обломов|раскольников|базаров|чацк'),
    ],
    'worldhistory': [
        ('wh-ancient', r'до н\.?\s?э|древн[иея]+|египет|фараон|месопотам|вавилон|шумер|ассири|перси[яи] древ|греци|афин|спарт|рим[аеу]?|римск|цезар|александр македон|олимпийск|фини|полис|пирамид'),
        ('wh-contemporary', r'оон|нато|евросоюз|европейск[ийого]+ союз|глобализ|снг|шос|21 век|xxi|террор|интернет'),
        ('wh-xx', r'первой мировой|второй мировой|мировой войн|холодн|ссср|гитлер|фашизм|нацизм|версальск|лиг[аи] наций|советск|1917|революц[ия]+ в росси|сталин|рузвельт|черчилл'),
        ('wh-modern', r'реформаци|великие географические|колумб|магеллан|промышленн|просвещени|французск[аяой]+ революц|наполеон|войн[аы] за независимост|абсолютизм|буржуазн|xvi|xvii|xviii|xix'),
        ('wh-medieval', r'средн[иея]+ век|феодал|крестов|рыцар|византи|франк|карл великий|папа римск|инквизиц|ренессанс|возрожден|халиф|араб|ислам'),
    ],
}
DEFAULT = {
    'math': 'math-algebra', 'mathlit': 'ml-logic', 'physics': 'phys-mechanics', 'chemistry': 'chem-inorganic',
    'biology': 'bio-human', 'geography': 'geo-economic', 'informatics': 'inf-logic', 'law': 'law-theory',
    'russian': 'ru-orthography', 'ruslit': 'rl-xix', 'worldhistory': 'wh-modern',
}


def topic_for(subject: str, text: str) -> str:
    if subject == 'history':
        return topic_history(text)
    if subject == 'worldhistory':
        ys = years(text)
        low = text.lower()
        if ys and not re.search(r'до н\.?\s?э', low):
            y = max(ys)
            return 'wh-contemporary' if y >= 1991 else 'wh-xx' if y >= 1900 else 'wh-modern' if y >= 1492 else 'wh-medieval' if y >= 476 else 'wh-ancient'
    low = text.lower()
    for tid, rx in KW.get(subject, []):
        if re.search(rx, low):
            return tid
    return DEFAULT[subject]


# ---------------------------------------------------------------- фильтры
BAD = re.compile(r'рисун|изображ[её]н|на график|по график|на схем|по схем|в таблиц|по таблиц|на фото|на карте|см\.\s*рис|указанн[ыо][йх] на', re.I)
PUNCT = re.compile(r'тире|двоеточ', re.I)


def convert(csv_dir: str):
    out, stats = [], {}
    for fname, subject in SUBJECTS.items():
        path = os.path.join(csv_dir, f'{fname}.csv')
        if not os.path.exists(path):
            continue
        kept = dropped = 0
        seen = set()
        for r in csv.DictReader(open(path, encoding='utf-8')):
            try:
                q = clean(r['Question'])
                opts = [clean(r[f'Option {k}']) for k in 'ABCDE' if (r.get(f'Option {k}') or '').strip()]
                key = 'ABCDE'.index(r['Answer Key'].strip())
            except (ValueError, KeyError):
                dropped += 1
                continue
            norm = q.lower()
            if (
                len(q) < 8 or len(opts) < 3 or key >= len(opts) or len(set(o.lower() for o in opts)) != len(opts)
                or any(not o for o in opts) or BAD.search(q) or norm in seen
                or (subject in ('russian', 'ruslit') and PUNCT.search(q))
            ):
                dropped += 1
                continue
            seen.add(norm)
            text = q + ' ' + opts[key]
            src = (r.get('Source') or '').strip()
            host = re.sub(r'https?://([^/]+)/.*', r'\1', src) if src else 'KazMMLU'
            # компактная строка: [id, тема, вопрос, варианты, ключ, ссылка на первоисточник]
            # остальные поля (источник, лицензия, пояснение) достраивает загрузчик src/data/questions/open/index.ts
            out.append({'subject': subject, 'row': [int(r['ID']), topic_for(subject, text), q, opts, key, src or DATASET]})
            kept += 1
        stats[subject] = (kept, dropped)
    return out, stats


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    data, stats = convert(sys.argv[1])
    out_dir = sys.argv[2]
    os.makedirs(out_dir, exist_ok=True)
    for subject in sorted({d['subject'] for d in data}):
        rows = [d['row'] for d in data if d['subject'] == subject]
        with open(os.path.join(out_dir, f'km-{subject}.json'), 'w', encoding='utf-8') as f:
            json.dump({'subject': subject, 'rows': rows}, f, ensure_ascii=False, separators=(',', ':'))
    for k, (a, b) in stats.items():
        print(f'{k:14} импортировано {a:5}  отброшено {b:4}')
    print('всего', len(data))
