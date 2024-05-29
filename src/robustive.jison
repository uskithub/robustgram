/* レキシカルセクションの開始。レキシカルアナライザは入力テキストをトークンと呼ばれる意味のある単位に分割する */
%lex 

// Special states for recognizing aliases
%x Actor
%x Countroller
%x Entity
%x Boundary
%x Usecase

%% /* アナライザの定義終わり。構文解析規則の開始 */


\%\%(?!\{)[^\n]*          /* skip comments */
[^\}]\%\%[^\n]*           /* skip comments */{ /*console.log('Crap after close');*/ }

[\s]+                     /* skip all whitespace */
"---"                     return 'DASHED_ARROW'
"-->"                     return 'SOLID_ARROW'
"("                       return '('
")"                       return ')'
"["                       return '['
"]"                       return ']'
[A-Za-z0-9_]+             return 'IDENTIFIER'
";"                       return ';'
"\\n"                     return 'NEWLINE'
<<EOF>>                   return 'EOF'

/lex

%start diagram

%%

diagram
    : /* empty */ { /*console.warn('empty document'); */ $$ = [] }
    | elementList EOF
    ;

elementList
    : element NEWLINE elementList
    | element
    ;

element
    : actor
    | controller
    | boundary
    | entity
    | usecase
    ;

actor
    : 'A' '[' IDENTIFIER ']' DASHED_ARROW boundary
    ;

boundary
    : 'B' '[' IDENTIFIER ']' SOLID_ARROW controller
    | 'B' '[' IDENTIFIER ']' SOLID_ARROW usecase
    ;

controller
    : 'C' '[' IDENTIFIER ']' '(' IDENTIFIER ')' SOLID_ARROW controller
    | 'C' '[' IDENTIFIER ']' '(' IDENTIFIER ')' SOLID_ARROW boundary
    | 'C' '[' IDENTIFIER ']' '(' IDENTIFIER ')' SOLID_ARROW usecase
    | 'C' '[' IDENTIFIER ']' '(' IDENTIFIER ')' DASHED_ARROW entity
    ;

%%