# Сторонние материалы

## KazMMLU — открытый банк заданий ЕНТ

Часть заданий (id вида `km-…`, папка `src/data/questions/open/`) взята из датасета **KazMMLU**:

- Датасет: https://huggingface.co/datasets/MBZUAI/KazMMLU
- Авторы: Togmanov M. и соавторы (MBZUAI) — полный список в статье ниже
- Статья: «KazMMLU: Evaluating Language Models on Kazakh, Russian, and Regional Knowledge of Kazakhstan», ACL 2025 — https://aclanthology.org/2025.acl-long.701
- Лицензия: **Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0)** — https://creativecommons.org/licenses/by-nc/4.0/

Изменения LexEdu: взяты русскоязычные и казахскоязычные школьные разделы (High School in rus / in kaz); формулы LaTeX переведены в текстовую запись;
удалены задания со ссылками на рисунки/таблицы, повреждённые пунктуационные задания и дубликаты;
задания распределены по темам LexEdu. Ссылка на первоисточник (itest.kz, ymnik.kz), указанная в датасете,
сохранена у каждого задания и показывается ученику в разборе.

**Ограничение лицензии:** CC BY-NC 4.0 запрещает коммерческое использование. Перед введением платных
функций необходимо получить разрешение правообладателей (авторов датасета и первоисточников) или
отключить открытый банк (удалить папку `src/data/questions/open/`).

Повторить импорт: `python3 scripts/import-kazmmlu.py <папка с CSV> src/data/questions/open ru` (и то же с `kk` для казахской части).
