# Dyktafon AI

System do nagrywania rozmów na telefonie oraz automatycznej transkrypcji i analizy nagrań z wykorzystaniem Make i Google Gemini.

Projekt łączy aplikację mobilną z automatyzacjami w Make. Wyniki analizy mogą być zapisywane w Google Sheets i prezentowane w pliku HTML.

## Najważniejsze funkcje

- nagrywanie rozmów w aplikacji mobilnej,
- nadawanie nagraniom własnych nazw,
- przechowywanie nagrań w telefonie,
- wysyłanie krótkich nagrań bezpośrednio do Make,
- obsługa dużych nagrań przez Google Drive,
- transkrypcja nagrania z podziałem na osoby,
- tworzenie podsumowania rozmowy,
- rozpoznawanie firmy i uczestników,
- wyodrębnianie ustaleń, zadań i terminów,
- zapis wyników w Google Sheets,
- przygotowanie czytelnego widoku HTML.

## Jak działa system

### Krótkie nagrania

1. Użytkownik rozpoczyna i kończy nagrywanie w aplikacji mobilnej.
2. Aplikacja przesyła nagranie do webhooka Make.
3. Make przekazuje plik wraz z poleceniem do Google Gemini.
4. Gemini wykonuje transkrypcję i analizę.
5. Make zapisuje wynik w Google Sheets oraz przygotowuje widok HTML.

### Duże nagrania

1. Nagranie zostaje zapisane w Google Drive.
2. Osobny scenariusz Make pobiera nowy plik.
3. Make przekazuje nagranie do Google Gemini.
4. Gemini wykonuje transkrypcję i analizę.
5. Make zapisuje wynik w Google Sheets oraz przygotowuje widok HTML.

## Zasada ograniczania kosztów

Jedno nagranie powinno powodować jedno wywołanie Google Gemini. Odpowiedź modelu zawiera jednocześnie transkrypcję, podsumowanie i pozostałe informacje. Kolejne moduły Make korzystają z już otrzymanego wyniku, bez ponownego wysyłania tego samego nagrania do modelu.

## Struktura repozytorium

```text
Dyktafon-AI/
├── make/
│   ├── ...OCZYSZCZONY....json
│   └── ...OCZYSZCZONY....json
├── mobile-app/
│   ├── App.js
│   ├── app.json
│   ├── index.js
│   ├── package.json
│   ├── assets/
│   └── components/
└── README.md
```

### `make`

Folder zawiera dwa oczyszczone blueprinty scenariuszy Make:

1. scenariusz dla nagrań wysyłanych bezpośrednio z aplikacji,
2. scenariusz dla dużych nagrań pobieranych z Google Drive.

Blueprint to plik JSON zawierający układ scenariusza Make i jego moduły. Po imporcie trzeba podłączyć własne konta i uzupełnić własne ustawienia.

### `mobile-app`

Folder zawiera kod aplikacji mobilnej wyeksportowany z Expo Snack. Publiczna wersja kodu nie zawiera działającego adresu webhooka Make.

## Wymagane usługi

Do uruchomienia całego systemu potrzebne są:

- konto Expo Snack lub lokalne środowisko Expo,
- konto Make,
- dostęp do Google Gemini API,
- konto Google Drive,
- arkusz Google Sheets,
- telefon z systemem Android lub iOS i aplikacją Expo Go — jeśli projekt jest testowany przez Expo.

## Konfiguracja aplikacji mobilnej

1. Otwórz projekt w Expo Snack albo uruchom go lokalnie jako projekt Expo.
2. Zainstaluj zależności zapisane w pliku `package.json`.
3. W pliku `App.js` znajdź miejsce przeznaczone na adres webhooka.
4. Zastąp tekst zastępczy własnym adresem webhooka Make.
5. Nie publikuj działającego adresu webhooka w publicznym repozytorium.
6. Uruchom aplikację i wykonaj krótkie nagranie testowe.

> Dokładne wersje bibliotek i zależności znajdują się w pliku `mobile-app/package.json`.

## Import scenariuszy Make

1. Zaloguj się do Make.
2. Utwórz nowy, pusty scenariusz.
3. W menu scenariusza wybierz opcję importowania blueprintu.
4. Wskaż jeden z plików JSON z folderu `make`.
5. Podłącz własne połączenia z usługami Google i Google Gemini.
6. Ustaw własny webhook, folder Google Drive i arkusz Google Sheets.
7. Sprawdź mapowanie danych w każdym module.
8. Zapisz scenariusz.
9. Najpierw wykonaj test na krótkim, niepoufnym nagraniu.
10. Dopiero po udanym teście włącz harmonogram scenariusza.

Zaimportowany blueprint nie udostępnia cudzych połączeń z kontami. Każdy użytkownik musi utworzyć lub wskazać własne połączenia.

## Przykładowy wynik analizy

Wynik może zawierać:

- nazwę spotkania,
- datę rozmowy,
- nazwę firmy,
- listę uczestników,
- pełną transkrypcję z podziałem na osoby,
- krótkie podsumowanie,
- najważniejsze ustalenia,
- zadania do wykonania,
- osoby odpowiedzialne,
- terminy,
- dodatkowe uwagi.

Zakres wyniku zależy od polecenia użytego w scenariuszu Make.

## Testy projektu

W czasie rozwoju sprawdzono między innymi:

- krótkie nagrania wysyłane bezpośrednio z telefonu,
- dłuższe nagrania zapisywane w Google Drive,
- zachowanie nagrań po ponownym uruchomieniu aplikacji,
- działanie kolejki nagrań bez dostępu do internetu,
- ponowną wysyłkę po odzyskaniu połączenia,
- generowanie transkrypcji, analizy i wpisów w Google Sheets,
- obsługę nagrań trwających około 40–60 minut.

Repozytorium przedstawia projekt w trakcie rozwoju. Przed użyciem z prawdziwymi danymi należy ponownie przetestować wszystkie połączenia i moduły.

## Bezpieczeństwo i prywatność

W publicznym repozytorium nie wolno umieszczać:

- kluczy API,
- tokenów i haseł,
- działających adresów webhooków,
- prywatnych identyfikatorów folderów i arkuszy,
- danych logowania,
- prawdziwych nagrań klientów,
- transkrypcji zawierających dane osobowe,
- oryginalnych, nieoczyszczonych blueprintów.

Przed każdym opublikowaniem zmian należy ponownie sprawdzić wszystkie pliki. Jeżeli działający webhook został wcześniej ujawniony, należy utworzyć nowy adres w Make i wyłączyć stary.

Użytkownik systemu odpowiada za uzyskanie zgody na nagrywanie rozmów oraz za zgodne z prawem przechowywanie i przetwarzanie nagrań.

## Aktualny stan

Obecna wersja repozytorium zawiera:

- oczyszczony kod aplikacji mobilnej,
- dwa oczyszczone scenariusze Make,
- obsługę krótkich i dużych nagrań,
- integrację z Google Gemini,
- zapis wyników do Google Sheets,
- generowanie widoku HTML.

## Plan dalszego rozwoju

- zachowanie nazwy wpisanej w telefonie jako nazwy pliku `.m4a`,
- automatyczne uruchamianie scenariusza po pojawieniu się nowego pliku w Google Drive,
- możliwość usuwania wpisów w widoku HTML,
- dalsze testy obsługi błędów i ponownej wysyłki,
- przygotowanie bezpiecznych zrzutów ekranu i schematu systemu,
- dalsza optymalizacja kosztów Google Gemini API.

## Dokumentacja użytych usług

- [Expo](https://docs.expo.dev/)
- [Make — blueprinty scenariuszy](https://help.make.com/blueprints)
- [Google Gemini API](https://ai.google.dev/gemini-api/docs)
- [Google Drive](https://developers.google.com/drive)
- [Google Sheets API](https://developers.google.com/workspace/sheets/api/guides/concepts)

## Informacja

Projekt ma charakter rozwojowy i edukacyjny. Przed wykorzystaniem produkcyjnym wymaga własnej konfiguracji, testów bezpieczeństwa oraz sprawdzenia zasad przetwarzania danych.
