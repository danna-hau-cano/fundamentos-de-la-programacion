#include <stdio.h>
#include <stdlib.h>
#include <windows.h>
#include <conio.h>

void moverCursor(int x, int y) {
    COORD posicion = {(SHORT)x, (SHORT)y};

    SetConsoleCursorPosition(
        GetStdHandle(STD_OUTPUT_HANDLE),
        posicion
    );
}

int main(void) {
    HANDLE consola = GetStdHandle(STD_OUTPUT_HANDLE);
    CONSOLE_CURSOR_INFO cursor;

    GetConsoleCursorInfo(consola, &cursor);
    cursor.bVisible = FALSE;
    SetConsoleCursorInfo(consola, &cursor);

    const char *logo[] = {
        "########################",
        "#                      #",
        "#                      #",
        "#          JJJ  SSSSS  #",
        "#           JJ SS      #",
        "#           JJ  SSSS   #",
        "#       JJ  JJ     SS  #",
        "#        JJJJ  SSSSS   #",
        "#                      #",
        "########################"
    };

    int x = 0;
    int direccion = 1;
    int ancho = 24;
    int alto = 10;

    CONSOLE_SCREEN_BUFFER_INFO pantalla;
    GetConsoleScreenBufferInfo(consola, &pantalla);

    int limite = pantalla.srWindow.Right
               - pantalla.srWindow.Left + 1 - ancho - 1;

    if (limite < 0) {
        limite = 0;
    }

    system("cls");

    printf("LOGO DE JAVASCRIPT HECHO EN C\n");
    printf("Presiona cualquier tecla para salir.\n");

    while (!_kbhit()) {
        SetConsoleTextAttribute(
            consola,
            FOREGROUND_RED | FOREGROUND_GREEN |
            FOREGROUND_INTENSITY
        );

        for (int i = 0; i < alto; i++) {
            moverCursor(x, i + 4);
            printf("%s", logo[i]);
        }

        fflush(stdout);
        Sleep(80);

        for (int i = 0; i < alto; i++) {
            moverCursor(x, i + 4);
            printf("%*s", ancho, "");
        }

        if (limite > 0) {
            x += direccion;

            if (x >= limite || x <= 0) {
                direccion = -direccion;
            }
        }
    }

    _getch();

    SetConsoleTextAttribute(
        consola,
        FOREGROUND_RED | FOREGROUND_GREEN | FOREGROUND_BLUE
    );

    cursor.bVisible = TRUE;
    SetConsoleCursorInfo(consola, &cursor);
    moverCursor(0, alto + 5);

    return 0;
}