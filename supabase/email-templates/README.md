# Шаблоны писем Supabase (на русском)

Supabase → **Authentication → Emails → Templates**. Для каждого шаблона вставьте тему и HTML из файла.

| Шаблон Supabase | Тема письма | Файл |
|---|---|---|
| Confirm signup | Подтвердите регистрацию в LexEdu Academy | `confirm-signup.html` |
| Reset password | Сброс пароля LexEdu Academy | `reset-password.html` |
| Change email address | Подтвердите новый email — LexEdu Academy | `change-email.html` |

Картинка Lexi берётся с сайта: `{{ .SiteURL }}/email/lexi.png`, поэтому в **Authentication → URL Configuration** должен быть указан адрес сайта (Site URL).
