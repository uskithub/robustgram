/* レキシカルセクションの開始。レキシカルアナライザは入力テキストをトークンと呼ばれる意味のある単位に分割する */
%lex

// Special states for recognizing aliases
%x ACTOR


%% /* アナライザの定義終わり。構文解析規則の開始 */

\%\%(?!\{)[^\n]*          /* skip comments */
[^\}]\%\%[^\n]*           /* skip comments */{ /*console.log('Crap after close');*/ }

[\n]+                     return 'NEW_LINE';
[\s]+                     /* skip all whitespace */

"robustive"\s+            { /* console.log('Got Robustness Diagram', yytext,'#'); */ return 'RD'; }


.+                        return 'LABEL'
[a-zA-Z0-9_]+             return 'IDENTIFIER'
"\\n"                     return 'CONTINUATION_LINE'
<<EOF>>                   return 'NEW_LINE';

/lex

%start start

%%

start
    : NEW_LINE start
    | RD usecase { /* console.log('--> Root document', $2); */   yy.setRootDoc($2); return $2; }
    ;

usecase
    : /* empty */ { /*console.log('empty document'); */ $$ = [] }
    | usecase line {
        if ($2 != 'nl') {
            /* console.log(' document: 1: ', $1, ' pushing 2: ', $2); */
            $1.push($2);
            $$ = $1;
        } else {
            $$ = [$2];
        }
    }
    ;

line
	: scenaria { $$ = $1 }
	| NEW_LINE { $$='nl';}
	;

scenaria
    : object RELATION object CONTINUATION_LINE
    | ARROW '[' LABEL ']' object CONTINUATION_LINE
    | RELATION object CONTINUATION_LINE
    | ARROW '[' LABEL ']' object
    ;

object
    : 'A' '[' LABEL ']'
    | 'B' '[' LABEL ']'
    | 'C' '[' LABEL ']' '(' IDENTIFIER ')'
    | 'E' '[' LABEL ']'
    | 'U' '[' LABEL ']'
    ;

%%