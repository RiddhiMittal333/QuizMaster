
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <ctype.h>

#define MAX 200
#define TEXT 256

typedef struct {
    int id;
    char category[TEXT], difficulty[TEXT], question[TEXT];
    char options[4][TEXT];
    char answer;
} Question;

typedef struct {
    char name[TEXT], category[TEXT];
    int score, total;
} PlayerScore;

void json(char s[]) {
    putchar('"');

    for (int i = 0; s[i]; i++) {
        if (s[i] == '"' || s[i] == '\\')
            putchar('\\');

        if (s[i] == '\n')
            printf("\\n");
        else if ((unsigned char)s[i] >= 32)
            putchar(s[i]);
    }

    putchar('"');
}

int load(Question q[]) {
    FILE *f = fopen("data/questions.txt", "r");
    char line[2048];
    int n = 0;

    if (!f) return 0;

    while (n < MAX && fgets(line, sizeof(line), f)) {
        Question x = {0};
        char *p = strtok(line, "|\r\n");
        int k = 0;

        while (p) {
            if (k == 0) x.id = atoi(p);
            else if (k == 1) strcpy(x.category, p);
            else if (k == 2) strcpy(x.difficulty, p);
            else if (k == 3) strcpy(x.question, p);
            else if (k < 8) strcpy(x.options[k-4], p);
            else if (k == 8) x.answer = toupper(p[0]);

            k++;
            p = strtok(NULL, "|\r\n");
        }

        if (k == 9)
            q[n++] = x;
    }

    fclose(f);
    return n;
}

void shuffle(Question q[], int n) {
    for (int i = n-1; i > 0; i--) {
        int j = rand() % (i+1);
        Question t = q[i];
        q[i] = q[j];
        q[j] = t;
    }
}

void show_questions(char category[]) {
    Question q[MAX], selected[MAX];
    int n = load(q), count = 0;

    if (!n) {
        printf("{\"error\":\"Could not load questions\"}");
        return;
    }

    for (int i = 0; i < n; i++) {
        if (!strcmp(category, "All") ||
            !strcmp(category, q[i].category)) {
            selected[count++] = q[i];
        }
    }

    shuffle(selected, count);

    if (count > 10) count = 10;

    printf("{\"questions\":[");

    for (int i = 0; i < count; i++) {
        if (i) putchar(',');

        printf("{\"id\":%d,\"category\":", selected[i].id);
        json(selected[i].category);

        printf(",\"difficulty\":");
        json(selected[i].difficulty);

        printf(",\"question\":");
        json(selected[i].question);

        printf(",\"options\":[");

        for (int j = 0; j < 4; j++) {
            if (j) putchar(',');
            json(selected[i].options[j]);
        }

        printf("]}");
    }

    printf("]}");
}

void finish_quiz(char name[], char category[], char answers[]) {
    Question questions[MAX];
    int n = load(questions);
    int score = 0, total = 0;
    char copy[4096];
    char *p;
    FILE *f;

    strcpy(copy, answers);
    p = copy;

    while (*p) {
        char *comma = strchr(p, ',');
        int id;
        char chosen;
        char correct = '?';

        if (comma)
            *comma = '\0';

        if (sscanf(p, "%d:%c", &id, &chosen) == 2) {

            for (int i = 0; i < n; i++) {
                if (questions[i].id == id) {
                    correct = questions[i].answer;
                    break;
                }
            }

            if (correct != '?') {
                total++;

                if (toupper(chosen) == correct)
                    score++;
            }
        }

        if (!comma) break;

        p = comma + 1;
    }

    if (total == 0) {
        printf("{\"error\":\"No valid answers were submitted\"}");
        return;
    }

    f = fopen("data/scores.txt", "a");

    if (!f) {
        printf("{\"error\":\"Could not save score\"}");
        return;
    }

    fprintf(f, "%s|%s|%d|%d\n",
            name, category, score, total);

    fclose(f);

    printf("{\"score\":%d,\"total\":%d,\"percentage\":%d}",
           score, total, score * 100 / total);
}

void leaderboard(void) {
    FILE *f = fopen("data/scores.txt", "r");
    PlayerScore s[1000], x;
    char line[1024], *p;
    int n = 0;

    if (!f) {
        printf("{\"scores\":[]}");
        return;
    }

    while (n < 1000 && fgets(line, sizeof(line), f)) {
        x = (PlayerScore){0};
        p = strtok(line, "|\r\n");
        int k = 0;

        while (p) {
            if (k == 0) strcpy(x.name, p);
            if (k == 1) strcpy(x.category, p);
            if (k == 2) x.score = atoi(p);
            if (k == 3) x.total = atoi(p);

            k++;
            p = strtok(NULL, "|\r\n");
        }

        if (k == 4 && x.total > 0)
            s[n++] = x;
    }

    fclose(f);

    for (int i = 0; i < n-1; i++) {
        for (int j = 0; j < n-i-1; j++) {
            if (s[j].score < s[j+1].score) {
                x = s[j];
                s[j] = s[j+1];
                s[j+1] = x;
            }
        }
    }

    if (n > 10) n = 10;

    printf("{\"scores\":[");

    for (int i = 0; i < n; i++) {
        if (i) putchar(',');

        printf("{\"name\":");
        json(s[i].name);

        printf(",\"category\":");
        json(s[i].category);

        printf(",\"score\":%d,\"total\":%d}",
               s[i].score, s[i].total);
    }

    printf("]}");
}

int main(int argc, char *argv[]) {
    srand(time(NULL));

    if (argc < 2) {
        printf("{\"error\":\"Missing action\"}");
        return 1;
    }

    if (!strcmp(argv[1], "questions")) {
        char category[TEXT] = "All";

        if (argc > 2)
            strcpy(category, argv[2]);

        show_questions(category);
    }
    else if (!strcmp(argv[1], "finish") && argc >= 5) {
        finish_quiz(argv[2], argv[3], argv[4]);
    }
    else if (!strcmp(argv[1], "leaderboard")) {
        leaderboard();
    }
    else {
        printf("{\"error\":\"Invalid action or arguments\"}");
    }

    return 0;
}
