import { builders } from './builders';

/**
 * IELTS Academic — оригинальный пробный тест LexEdu в формате IELTS
 * (Reading 40, Listening 40, Writing 2 задания, Speaking 3 части). Не является материалом IELTS/British Council/IDP.
 * Listening-скрипты озвучиваются синтезатором речи браузера.
 */
const note = 'Original LexEdu practice material in IELTS format. Not official IELTS material.';
const RD = builders('ielts-reading', 'ir');
const LS = builders('ielts-listening', 'il');
const WR = builders('ielts-writing', 'iw');
const SP = builders('ielts-speaking', 'is');
const TFNG = ['TRUE', 'FALSE', 'NOT GIVEN'];
const YNNG = ['YES', 'NO', 'NOT GIVEN'];

/* ============================ READING ============================ */
const P1 = `THE RETURN OF THE SAIGA
A. The saiga antelope, with its unusual drooping nose, once roamed the steppes of Central Asia in herds of hundreds of thousands. Its oversized nose is not decoration: it warms freezing winter air and filters out dust during the hot, dry summers.
B. In the 1990s, however, the species came close to extinction. Economic hardship led to widespread hunting, and males were targeted for their horns, which were sold for use in traditional medicine. By 2003, scientists estimated that fewer than 40,000 saigas remained in Kazakhstan, compared with more than one million in the 1970s.
C. Conservation efforts began in earnest in the early 2000s. Ranger patrols were increased, hunting was banned, and protected areas were created across the Betpak-Dala and Ustyurt regions. Equally important was the work done with local communities. Schoolchildren took part in "Saiga Day" festivals, and herders were encouraged to report poaching.
D. In 2015, disaster struck again. Within a few weeks, more than 200,000 saigas died from a bacterial infection. Researchers later linked the outbreak to unusually warm and humid weather, which allowed normally harmless bacteria in the animals' bodies to become deadly.
E. Remarkably, the population recovered quickly. Saigas breed fast: females can reproduce in their first year and often give birth to twins. By 2022, aerial surveys counted well over one million animals. The saiga's status was later improved on the international Red List, a rare success story in wildlife conservation.
F. The recovery has created new challenges. Large herds now graze on farmland, and some farmers complain about damaged crops. Scientists argue that long-term success will depend on finding a balance between the needs of wildlife and those of rural people.`;

const P2 = `FARMING UPWARDS
Vertical farming—growing crops in stacked layers indoors—has attracted enormous attention as cities search for ways to feed growing populations. Instead of soil, most vertical farms use hydroponics, a method in which plant roots sit in nutrient-rich water. LED lights replace the sun, and computers control temperature and humidity.
Supporters point to several advantages. Because conditions are controlled, crops can be harvested all year round, regardless of the weather. Vertical farms use up to 95 percent less water than traditional fields, since water is recycled in closed systems. Pesticides are rarely needed because insects cannot easily enter the buildings. Finally, farms located inside cities can deliver fresh produce to shops within hours, reducing transport costs.
Critics, however, highlight the high energy demand. Lighting and climate control consume large amounts of electricity, and unless that electricity comes from renewable sources, the environmental benefits may disappear. Building costs are also high, and several well-funded vertical farming companies have closed in recent years after failing to make a profit.
Another limitation is the range of crops. Leafy greens such as lettuce and basil grow quickly and are light, which makes them ideal for vertical systems. Staple crops like wheat or rice, which need a lot of space and light and have low market value per kilogram, are currently not profitable to grow indoors.
Many experts therefore see vertical farming not as a replacement for traditional agriculture but as a complement to it. In regions with little water or a harsh climate, they argue, indoor farms could play an important role in improving food security.`;

const P3 = `HOW HABITS ARE FORMED
For many years, people believed that it takes exactly 21 days to form a new habit. The figure appears in countless self-help books, yet it has little scientific basis. It is thought to have originated with a surgeon in the 1960s who noticed that patients needed about three weeks to get used to changes in their appearance.
A frequently cited study from University College London tested the idea more carefully. Volunteers chose a simple daily behaviour, such as drinking a glass of water after breakfast, and reported each day whether it felt automatic. On average, it took 66 days for the behaviour to reach its maximum level of automaticity, but the range was enormous—from 18 to 254 days. Missing a single day did not significantly affect the process.
Psychologists describe habits as a loop with three parts: a cue, a routine and a reward. The cue is a trigger, such as a time of day or a location. The routine is the behaviour itself, and the reward is the benefit that makes the brain want to repeat it. Over time, the brain begins to anticipate the reward as soon as it notices the cue.
This explains why changing the environment can be so effective. People who want to eat more healthily, for example, are more successful when they keep fruit visible on the kitchen table rather than relying on willpower alone. In the opinion of many researchers, willpower is less important than most people assume; designing situations that make good choices easy is a more reliable strategy.
Not all experts agree on how quickly results appear. Nevertheless, there is broad agreement that consistency matters more than intensity: a short daily practice is more likely to become a habit than an occasional long one.`;

const READING = [
  // Passage 1 — TRUE/FALSE/NOT GIVEN (1–7)
  RD.single('ir-tfng', 'easy', 'The saiga\'s large nose helps it cope with extreme temperatures and dust.', TFNG, 0, 'Paragraph A: it warms freezing air and filters out dust.', { passage: P1, group: 'ir-p1' }),
  RD.single('ir-tfng', 'medium', 'Female saigas were hunted more than males in the 1990s.', TFNG, 1, 'Paragraph B: males were targeted for their horns.', { passage: P1, group: 'ir-p1' }),
  RD.single('ir-tfng', 'medium', 'In the 1970s there were over one million saigas in Kazakhstan.', TFNG, 0, 'Paragraph B: "more than one million in the 1970s".', { passage: P1, group: 'ir-p1' }),
  RD.single('ir-tfng', 'medium', 'The protected areas were funded by international banks.', TFNG, 2, 'Funding is not mentioned.', { passage: P1, group: 'ir-p1' }),
  RD.single('ir-tfng', 'medium', 'The 2015 deaths were caused by a new virus brought by migrating birds.', TFNG, 1, 'Paragraph D: a bacterial infection linked to warm, humid weather.', { passage: P1, group: 'ir-p1' }),
  RD.single('ir-tfng', 'medium', 'Saiga females may give birth in their first year of life.', TFNG, 0, 'Paragraph E: "females can reproduce in their first year".', { passage: P1, group: 'ir-p1' }),
  RD.single('ir-tfng', 'hard', 'All farmers in the region support the growth of saiga herds.', TFNG, 1, 'Paragraph F: some farmers complain about damaged crops.', { passage: P1, group: 'ir-p1' }),
  // Passage 1 — sentence completion (8–13)
  RD.text('ir-completion', 'medium', 'Complete the sentence. Use NO MORE THAN TWO WORDS from the text. — Saiga horns were sold for use in traditional ______.', ['medicine'], 'Paragraph B: "for use in traditional medicine".', { passage: P1, group: 'ir-p1', wordLimit: 2 }),
  RD.text('ir-completion', 'medium', 'Complete the sentence. Use ONE NUMBER from the text. — By the year ______, fewer than 40,000 saigas remained in Kazakhstan.', ['2003'], 'Paragraph B: "By 2003…".', { passage: P1, group: 'ir-p1', wordLimit: 1 }),
  RD.text('ir-completion', 'medium', 'Complete the sentence. Use NO MORE THAN TWO WORDS. — Schoolchildren took part in festivals called "______".', ['saiga day'], 'Paragraph C: "Saiga Day" festivals.', { passage: P1, group: 'ir-p1', wordLimit: 2 }),
  RD.text('ir-completion', 'medium', 'Complete the sentence. Use ONE WORD. — Herders were encouraged to report ______.', ['poaching'], 'Paragraph C.', { passage: P1, group: 'ir-p1', wordLimit: 1 }),
  RD.text('ir-completion', 'hard', 'Complete the sentence. Use NO MORE THAN TWO WORDS. — Normally ______ bacteria became deadly because of warm and humid weather.', ['harmless'], 'Paragraph D: "normally harmless bacteria".', { passage: P1, group: 'ir-p1', wordLimit: 2 }),
  RD.text('ir-completion', 'medium', 'Complete the sentence. Use NO MORE THAN TWO WORDS. — The population in 2022 was measured by ______ surveys.', ['aerial'], 'Paragraph E: "aerial surveys".', { passage: P1, group: 'ir-p1', wordLimit: 2 }),
  // Passage 2 — multiple choice (14–19)
  RD.single('ir-mcq', 'easy', 'What do most vertical farms use instead of soil?', ['Sand', 'Nutrient-rich water', 'Recycled paper', 'Clay'], 1, 'Hydroponics: roots sit in nutrient-rich water.', { passage: P2, group: 'ir-p2' }),
  RD.single('ir-mcq', 'medium', 'Why are pesticides rarely needed in vertical farms?', ['Plants are genetically modified', 'Insects cannot easily enter the buildings', 'LED light kills insects', 'Crops grow too fast'], 1, 'Paragraph 2.', { passage: P2, group: 'ir-p2' }),
  RD.single('ir-mcq', 'medium', 'According to the writer, the main criticism of vertical farming concerns', ['taste', 'energy demand', 'lack of workers', 'water quality'], 1, 'Paragraph 3: "Critics … highlight the high energy demand."', { passage: P2, group: 'ir-p2' }),
  RD.single('ir-mcq', 'medium', 'Why are lettuce and basil well suited to vertical farms?', ['They need little water', 'They grow quickly and are light', 'They are expensive to import', 'They do not need light'], 1, 'Paragraph 4.', { passage: P2, group: 'ir-p2' }),
  RD.single('ir-mcq', 'hard', 'Why is wheat not currently grown in vertical farms?', ['It needs too much water', 'It has low value per kilogram and needs much space and light', 'It cannot grow hydroponically', 'It is banned in cities'], 1, 'Paragraph 4.', { passage: P2, group: 'ir-p2' }),
  RD.single('ir-mcq', 'hard', 'What is the writer\'s overall view of vertical farming?', ['It will soon replace traditional farming', 'It is a useful addition to traditional agriculture', 'It has no real benefits', 'It should be banned'], 1, 'Final paragraph: "not as a replacement … but as a complement".', { passage: P2, group: 'ir-p2' }),
  // Passage 2 — TRUE/FALSE/NOT GIVEN (20–26)
  RD.single('ir-tfng', 'easy', 'Vertical farms can produce crops in any season.', TFNG, 0, '"Crops can be harvested all year round."', { passage: P2, group: 'ir-p2' }),
  RD.single('ir-tfng', 'medium', 'Vertical farms always use renewable electricity.', TFNG, 1, 'The text says benefits may disappear "unless" electricity is renewable — so not always.', { passage: P2, group: 'ir-p2' }),
  RD.single('ir-tfng', 'medium', 'Vertical farms use up to 95 percent less water than fields.', TFNG, 0, 'Paragraph 2.', { passage: P2, group: 'ir-p2' }),
  RD.single('ir-tfng', 'medium', 'The first vertical farm was built in Japan.', TFNG, 2, 'Not mentioned.', { passage: P2, group: 'ir-p2' }),
  RD.single('ir-tfng', 'medium', 'Some vertical farming companies have stopped operating.', TFNG, 0, '"Several … companies have closed."', { passage: P2, group: 'ir-p2' }),
  RD.single('ir-tfng', 'hard', 'Rice is more profitable than basil in vertical farms.', TFNG, 1, 'Staple crops are "currently not profitable" indoors.', { passage: P2, group: 'ir-p2' }),
  RD.single('ir-tfng', 'medium', 'Fresh produce from city farms can reach shops within hours.', TFNG, 0, 'Paragraph 2.', { passage: P2, group: 'ir-p2' }),
  // Passage 3 — multiple choice (27–31)
  RD.single('ir-mcq', 'medium', 'Where does the "21 days" idea probably come from?', ['A large university study', 'A surgeon\'s observations of patients', 'An ancient philosopher', 'A sports coach'], 1, 'Paragraph 1.', { passage: P3, group: 'ir-p3' }),
  RD.single('ir-mcq', 'medium', 'In the UCL study, how long did it take on average to reach maximum automaticity?', ['18 days', '21 days', '66 days', '254 days'], 2, 'Paragraph 2: "On average, it took 66 days".', { passage: P3, group: 'ir-p3' }),
  RD.single('ir-mcq', 'medium', 'What did the study find about missing one day?', ['It reset the process', 'It had no significant effect', 'It doubled the time needed', 'It improved results'], 1, 'Paragraph 2.', { passage: P3, group: 'ir-p3' }),
  RD.single('ir-mcq', 'medium', 'In the habit loop, a cue is', ['the benefit of the behaviour', 'the behaviour itself', 'a trigger such as a time or place', 'a type of reward'], 2, 'Paragraph 3.', { passage: P3, group: 'ir-p3' }),
  RD.single('ir-mcq', 'hard', 'Why does the writer mention fruit on a kitchen table?', ['To show that fruit is cheap', 'To illustrate how the environment can support a habit', 'To criticise willpower', 'To describe a reward'], 1, 'Paragraph 4: changing the environment makes good choices easy.', { passage: P3, group: 'ir-p3' }),
  // Passage 3 — YES/NO/NOT GIVEN (32–35)
  RD.single('ir-tfng', 'medium', 'Does the writer agree that the 21-day rule has strong scientific support?', YNNG, 1, '"…it has little scientific basis."', { passage: P3, group: 'ir-p3' }),
  RD.single('ir-tfng', 'hard', 'Do many researchers believe willpower is less important than people think?', YNNG, 0, '"In the opinion of many researchers, willpower is less important than most people assume."', { passage: P3, group: 'ir-p3' }),
  RD.single('ir-tfng', 'medium', 'Does the writer say habits are easier to form in the morning?', YNNG, 2, 'Not mentioned.', { passage: P3, group: 'ir-p3' }),
  RD.single('ir-tfng', 'medium', 'Do experts agree that consistency is more important than intensity?', YNNG, 0, 'Final paragraph: "broad agreement that consistency matters more than intensity".', { passage: P3, group: 'ir-p3' }),
  // Passage 3 — summary completion (36–40)
  RD.text('ir-completion', 'medium', 'Complete the summary. ONE WORD. — A habit loop consists of a cue, a routine and a ______.', ['reward'], 'Paragraph 3.', { passage: P3, group: 'ir-p3', wordLimit: 1 }),
  RD.text('ir-completion', 'medium', 'Complete the summary. ONE WORD. — In the UCL study, volunteers chose a simple ______ behaviour.', ['daily'], '"chose a simple daily behaviour".', { passage: P3, group: 'ir-p3', wordLimit: 1 }),
  RD.text('ir-completion', 'hard', 'Complete the summary. ONE WORD. — Over time, the brain begins to ______ the reward as soon as it notices the cue.', ['anticipate'], 'Paragraph 3.', { passage: P3, group: 'ir-p3', wordLimit: 1 }),
  RD.text('ir-completion', 'medium', 'Complete the summary. ONE NUMBER. — The time needed ranged from 18 to ______ days.', ['254'], 'Paragraph 2.', { passage: P3, group: 'ir-p3', wordLimit: 1 }),
  RD.text('ir-completion', 'medium', 'Complete the summary. ONE WORD. — A short ______ practice is more likely to become a habit than an occasional long one.', ['daily'], 'Final paragraph.', { passage: P3, group: 'ir-p3', wordLimit: 1 }),
];

/* ============================ LISTENING ============================ */
const L1 = `Receptionist: Good morning, City Sports Centre. How can I help you?
Student: Hi, I'd like to book a place on the beginners' swimming course.
Receptionist: Of course. Can I have your name, please?
Student: Yes, it's Dana Serikova. That's S-E-R-I-K-O-V-A.
Receptionist: Thank you. And a contact phone number?
Student: It's 0 7 7 1, 4 5 8, 2 3 9.
Receptionist: Lovely. The course starts on the fourteenth of March and runs for eight weeks.
Student: What time are the lessons?
Receptionist: There's a class on Tuesdays at six thirty in the evening.
Student: That's perfect. How much does it cost?
Receptionist: For students it's forty-five dollars for the whole course. You'll need to bring a swimming cap — goggles are optional.
Student: Do I need to show anything?
Receptionist: Yes, please bring your student card on the first day. And the pool is on the second floor, next to the gym.
Student: Great, thank you very much.`;

const L2 = `Guide: Welcome to the Museum of the Steppe. Before we begin, a few practical points. The tour lasts about ninety minutes. Photography is allowed in all galleries except the Gold Room, where flash can damage the ancient objects.
We'll start on the ground floor with the Nomad Gallery, which shows how families moved their homes several times a year. The most popular exhibit there is a full-size yurt that visitors can actually walk into.
Next, we'll go upstairs to the Gold Room. Its highlight is a replica of the Golden Man, a warrior's costume decorated with more than four thousand gold pieces. The original was discovered in nineteen sixty-nine.
After that, there's a twenty-minute break. The café is near the main entrance, and the gift shop is on the left as you leave.
Finally, we'll finish in the new Space Hall, which opened last year. Children especially enjoy the flight simulator there, but please note that it's only available for visitors over eight years old.`;

const L3 = `Tutor: So, Arman and Lisa, how is your research project going?
Arman: Quite well. We decided to focus on how students use public transport, rather than on cycling, because there was more data available.
Lisa: Yes, and we chose an online questionnaire instead of interviews. It was quicker, and we got more than two hundred responses.
Tutor: Impressive. What was the most surprising finding?
Arman: I expected cost to be the main complaint, but actually most students said the biggest problem was that buses are unreliable — they don't arrive on time.
Tutor: Interesting. And what will you do next?
Lisa: We need to analyse the data properly. I think we should present the results in bar charts, because they make comparisons clear.
Arman: I agree. And for the final section, we'll recommend that the city publish real-time bus information on a mobile app.
Tutor: Good. Remember the report must be no longer than three thousand words, and the deadline is the twentieth of May.`;

const L4 = `Lecturer: Today I'd like to talk about honeybees and why they matter so much to agriculture.
Honeybees are responsible for pollinating around one third of the crops we eat, including apples, almonds and many vegetables. Without them, farmers would have to pollinate flowers by hand, which is extremely expensive.
A typical colony contains one queen, a few hundred males called drones, and tens of thousands of female worker bees. The workers do almost everything: they collect nectar, build the wax comb, and protect the hive.
Communication is remarkable. When a worker finds a good source of food, she performs a waggle dance. The angle of the dance shows the direction of the food relative to the sun, and the length of the waggle shows the distance.
Unfortunately, bee populations have declined in many countries. Scientists point to three main causes: pesticides, loss of habitat, and parasites, especially a mite called Varroa.
There are, however, simple solutions. Farmers can plant wildflowers at the edges of fields, which provide food for bees throughout the season. Cities are also helping: in some places, beekeepers now keep hives on the roofs of office buildings.`;

const LISTENING = [
  // Part 1 — form completion
  LS.text('il-social', 'easy', 'Part 1. Complete the form. ONE WORD. — Surname: ______', ['serikova'], 'Spelled in the recording: S-E-R-I-K-O-V-A.', { audio: L1, group: 'il-p1', wordLimit: 1 }),
  LS.text('il-social', 'medium', 'Part 1. Phone number: ______ (write digits without spaces)', ['0771458239', '0771 458 239'], '0 7 7 1, 4 5 8, 2 3 9.', { audio: L1, group: 'il-p1', wordLimit: 1 }),
  LS.text('il-social', 'medium', 'Part 1. Course start date: ______ March (write a number)', ['14', '14th', 'fourteenth'], '"The course starts on the fourteenth of March".', { audio: L1, group: 'il-p1', wordLimit: 1 }),
  LS.text('il-social', 'easy', 'Part 1. Length of course: ______ weeks (write a number)', ['8', 'eight'], '"runs for eight weeks".', { audio: L1, group: 'il-p1', wordLimit: 1 }),
  LS.text('il-social', 'easy', 'Part 1. Day of class: ______', ['tuesday', 'tuesdays'], '"on Tuesdays".', { audio: L1, group: 'il-p1', wordLimit: 1 }),
  LS.text('il-social', 'medium', 'Part 1. Time: ______ pm', ['6.30', '6:30', 'six thirty'], '"six thirty in the evening".', { audio: L1, group: 'il-p1', wordLimit: 2 }),
  LS.text('il-social', 'medium', 'Part 1. Student price: $______', ['45', 'forty-five', 'forty five'], '"forty-five dollars".', { audio: L1, group: 'il-p1', wordLimit: 1 }),
  LS.text('il-social', 'medium', 'Part 1. Must bring: a swimming ______', ['cap'], '"You\'ll need to bring a swimming cap".', { audio: L1, group: 'il-p1', wordLimit: 1 }),
  LS.text('il-social', 'medium', 'Part 1. On the first day, show your student ______', ['card'], '"bring your student card".', { audio: L1, group: 'il-p1', wordLimit: 1 }),
  LS.text('il-social', 'medium', 'Part 1. The pool is next to the ______', ['gym'], '"next to the gym".', { audio: L1, group: 'il-p1', wordLimit: 1 }),
  // Part 2 — multiple choice
  LS.single('il-social', 'easy', 'Part 2. How long does the tour last?', ['60 minutes', '90 minutes', '2 hours', '20 minutes'], 1, '"about ninety minutes".', { audio: L2, group: 'il-p2' }),
  LS.single('il-social', 'medium', 'Part 2. Where is photography NOT allowed?', ['Nomad Gallery', 'Gold Room', 'Space Hall', 'Café'], 1, '"except the Gold Room".', { audio: L2, group: 'il-p2' }),
  LS.single('il-social', 'medium', 'Part 2. Why is flash not allowed there?', ['It disturbs visitors', 'It can damage ancient objects', 'It is too expensive', 'It breaks the cameras'], 1, '"flash can damage the ancient objects".', { audio: L2, group: 'il-p2' }),
  LS.single('il-social', 'medium', 'Part 2. What is the most popular exhibit in the Nomad Gallery?', ['A map of the steppe', 'A full-size yurt', 'A horse saddle', 'A video film'], 1, '"a full-size yurt that visitors can walk into".', { audio: L2, group: 'il-p2' }),
  LS.single('il-social', 'medium', 'Part 2. How many gold pieces decorate the costume?', ['More than 400', 'More than 4,000', 'About 40,000', '969'], 1, '"more than four thousand gold pieces".', { audio: L2, group: 'il-p2' }),
  LS.single('il-social', 'medium', 'Part 2. When was the original Golden Man discovered?', ['1959', '1969', '1979', '1996'], 1, '"in nineteen sixty-nine".', { audio: L2, group: 'il-p2' }),
  LS.single('il-social', 'easy', 'Part 2. How long is the break?', ['10 minutes', '15 minutes', '20 minutes', '30 minutes'], 2, '"a twenty-minute break".', { audio: L2, group: 'il-p2' }),
  LS.single('il-social', 'medium', 'Part 2. Where is the café?', ['Near the main entrance', 'On the second floor', 'Next to the Space Hall', 'In the Gold Room'], 0, '"The café is near the main entrance".', { audio: L2, group: 'il-p2' }),
  LS.single('il-social', 'medium', 'Part 2. When did the Space Hall open?', ['Last month', 'Last year', 'Two years ago', 'In 1969'], 1, '"which opened last year".', { audio: L2, group: 'il-p2' }),
  LS.single('il-social', 'medium', 'Part 2. Who can use the flight simulator?', ['Everyone', 'Only adults', 'Visitors over eight years old', 'Only school groups'], 2, '"only available for visitors over eight years old".', { audio: L2, group: 'il-p2' }),
  // Part 3 — multiple choice
  LS.single('il-academic', 'medium', 'Part 3. Why did the students choose public transport as their topic?', ['It was the tutor\'s idea', 'More data was available', 'They both use buses', 'Cycling is unpopular'], 1, '"because there was more data available".', { audio: L3, group: 'il-p3' }),
  LS.single('il-academic', 'medium', 'Part 3. Which research method did they use?', ['Interviews', 'An online questionnaire', 'Observation', 'Focus groups'], 1, '"we chose an online questionnaire instead of interviews".', { audio: L3, group: 'il-p3' }),
  LS.single('il-academic', 'easy', 'Part 3. How many responses did they receive?', ['Fewer than 100', 'About 150', 'More than 200', 'Exactly 3,000'], 2, '"more than two hundred responses".', { audio: L3, group: 'il-p3' }),
  LS.single('il-academic', 'medium', 'Part 3. What did Arman expect the main complaint to be?', ['Reliability', 'Cost', 'Comfort', 'Safety'], 1, '"I expected cost to be the main complaint".', { audio: L3, group: 'il-p3' }),
  LS.single('il-academic', 'medium', 'Part 3. What was the biggest problem according to students?', ['High prices', 'Buses do not arrive on time', 'Dirty buses', 'Rude drivers'], 1, '"buses are unreliable — they don\'t arrive on time".', { audio: L3, group: 'il-p3' }),
  LS.single('il-academic', 'medium', 'Part 3. How will they present the results?', ['Pie charts', 'Bar charts', 'Tables only', 'A video'], 1, '"present the results in bar charts".', { audio: L3, group: 'il-p3' }),
  LS.single('il-academic', 'medium', 'Part 3. Why does Lisa prefer this format?', ['It is quicker to make', 'It makes comparisons clear', 'The tutor requires it', 'It looks colourful'], 1, '"because they make comparisons clear".', { audio: L3, group: 'il-p3' }),
  LS.single('il-academic', 'medium', 'Part 3. What will they recommend?', ['Cheaper tickets', 'More bus lanes', 'Real-time bus information on a mobile app', 'Free bicycles'], 2, '"publish real-time bus information on a mobile app".', { audio: L3, group: 'il-p3' }),
  LS.single('il-academic', 'easy', 'Part 3. What is the maximum length of the report?', ['2,000 words', '2,500 words', '3,000 words', '5,000 words'], 2, '"no longer than three thousand words".', { audio: L3, group: 'il-p3' }),
  LS.single('il-academic', 'easy', 'Part 3. When is the deadline?', ['2nd May', '12th May', '20th May', '30th May'], 2, '"the deadline is the twentieth of May".', { audio: L3, group: 'il-p3' }),
  // Part 4 — note completion
  LS.text('il-academic', 'medium', 'Part 4. Honeybees pollinate about one ______ of the crops we eat. (ONE WORD)', ['third'], '"around one third of the crops".', { audio: L4, group: 'il-p4', wordLimit: 1 }),
  LS.text('il-academic', 'medium', 'Part 4. Without bees, farmers would have to pollinate by ______. (ONE WORD)', ['hand'], '"pollinate flowers by hand".', { audio: L4, group: 'il-p4', wordLimit: 1 }),
  LS.text('il-academic', 'medium', 'Part 4. Male bees are called ______. (ONE WORD)', ['drones'], '"males called drones".', { audio: L4, group: 'il-p4', wordLimit: 1 }),
  LS.text('il-academic', 'medium', 'Part 4. Worker bees build the ______ comb. (ONE WORD)', ['wax'], '"build the wax comb".', { audio: L4, group: 'il-p4', wordLimit: 1 }),
  LS.text('il-academic', 'medium', 'Part 4. A worker who finds food performs a ______ dance. (ONE WORD)', ['waggle'], '"she performs a waggle dance".', { audio: L4, group: 'il-p4', wordLimit: 1 }),
  LS.text('il-academic', 'hard', 'Part 4. The angle of the dance shows direction relative to the ______. (ONE WORD)', ['sun'], '"relative to the sun".', { audio: L4, group: 'il-p4', wordLimit: 1 }),
  LS.text('il-academic', 'hard', 'Part 4. The length of the waggle shows the ______. (ONE WORD)', ['distance'], '"the length of the waggle shows the distance".', { audio: L4, group: 'il-p4', wordLimit: 1 }),
  LS.text('il-academic', 'medium', 'Part 4. One cause of decline is a mite called ______. (ONE WORD)', ['varroa'], '"a mite called Varroa".', { audio: L4, group: 'il-p4', wordLimit: 1 }),
  LS.text('il-academic', 'medium', 'Part 4. Farmers can plant ______ at the edges of fields. (ONE WORD)', ['wildflowers'], '"plant wildflowers at the edges of fields".', { audio: L4, group: 'il-p4', wordLimit: 1 }),
  LS.text('il-academic', 'medium', 'Part 4. In some cities, hives are kept on the ______ of office buildings. (ONE WORD)', ['roofs', 'roof'], '"on the roofs of office buildings".', { audio: L4, group: 'il-p4', wordLimit: 1 }),
];

/* ============================ WRITING ============================ */
const WRITING = [
  WR.essay('iw-task1', 'medium', 'Writing Task 1. The table below shows the percentage of households with internet access in three countries in 2005, 2015 and 2025.\n\n| Country | 2005 | 2015 | 2025 |\n|---|---|---|---|\n| Country A | 35% | 72% | 95% |\n| Country B | 12% | 48% | 81% |\n| Country C | 60% | 85% | 92% |\n\nSummarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.', 'writing1', 150, 'A strong answer includes an overview (all three countries grew; B grew most; C started highest but was overtaken by A), key figures and comparisons, without personal opinion.'),
  WR.essay('iw-task1', 'medium', 'Writing Task 1. The process below shows how drinking water is produced from river water: (1) water is pumped from the river; (2) large objects are removed by screens; (3) chemicals are added so small particles stick together; (4) the water passes through sand filters; (5) chlorine is added to kill bacteria; (6) clean water is stored in a reservoir and sent to homes.\n\nSummarise the information by selecting and reporting the main features. Write at least 150 words.', 'writing1', 150, 'Describe the stages in order using sequencing language and the passive voice; include an overview (six stages, from intake to distribution).'),
  WR.essay('iw-task2', 'medium', 'Writing Task 2. Some people believe that university education should be free for all students. Others think students should pay for their own studies. Discuss both views and give your own opinion. Write at least 250 words.', 'writing2', 250, 'Present both sides with reasons and examples, state a clear position, and use paragraphs with topic sentences.'),
  WR.essay('iw-task2', 'medium', 'Writing Task 2. In many cities, traffic congestion is becoming a serious problem. What are the causes of this problem, and what measures could be taken to solve it? Write at least 250 words.', 'writing2', 250, 'Problem–solution essay: explain 2–3 causes and match them with realistic solutions.'),
  WR.essay('iw-task2', 'hard', 'Writing Task 2. Some people think that online learning will soon replace traditional classrooms. To what extent do you agree or disagree? Write at least 250 words.', 'writing2', 250, 'Opinion essay: take a clear position throughout and support it with developed arguments.'),
];

/* ============================ SPEAKING ============================ */
const SPEAKING = [
  SP.essay('is-part1', 'easy', 'Speaking Part 1. Let\'s talk about your hometown. Where is your hometown? What do you like most about it? Has it changed much in recent years?', 'speaking', 40, 'Answer each question in 2–3 sentences with reasons or examples.'),
  SP.essay('is-part1', 'easy', 'Speaking Part 1. Let\'s talk about studying. What subject do you enjoy most? Do you prefer studying alone or with others? Why?', 'speaking', 40, 'Extend answers with reasons; avoid one-word replies.'),
  SP.essay('is-part2', 'medium', 'Speaking Part 2. Describe a book that you enjoyed reading. You should say: what the book was; when you read it; what it was about; and explain why you enjoyed it. (You have 1 minute to prepare and should speak for 1–2 minutes.)', 'speaking', 150, 'Cover all bullet points, use past tenses and descriptive vocabulary, speak for the full two minutes.'),
  SP.essay('is-part2', 'medium', 'Speaking Part 2. Describe a time when you helped someone. You should say: who you helped; how you helped them; why you helped; and explain how you felt afterwards.', 'speaking', 150, 'Tell a clear story with a beginning, middle and end.'),
  SP.essay('is-part3', 'hard', 'Speaking Part 3. Do you think people read less today than in the past? Why? How could schools encourage young people to read more?', 'speaking', 100, 'Discuss abstract ideas, compare past and present, give reasons and examples.'),
  SP.essay('is-part3', 'hard', 'Speaking Part 3. Why do some people choose to volunteer? Should governments encourage volunteering? How?', 'speaking', 100, 'Give balanced, developed answers with examples.'),
];

export const IELTS_QUESTIONS = [...READING, ...LISTENING, ...WRITING, ...SPEAKING].map((x) => ({ ...x, sourceNote: note }));
