%lex

%%

"robustive"\s+            { /* console.log('Got Robustness Diagram', yytext,'#'); */ return 'RD'; }
[\s]+                     /* skip all whitespace */
[\n]+                     return 'NL';
(A|B|C|E|U)\[.+?\]        return 'object';

"---"                     return '---';
"-->"                     return '-->';

"A"                       return 'ACTOR';
"["                       return '[';
"]"                       return ']';
.+                        return 'LABRL';

/lex

%start start

%%

start
    : NL start
    | RD usecase { yy.setRootDoc($2); return $2; }
    ;

usecase
    : /* empty */ { console.log('★empty'); $$ = [] }
    | usecase line {
        if ($2 != 'nl') {
            console.log('★if [usecase]:', $1, ' [line]:', $2);
            $1.push($2);
            $$ = $1;
        } else {
            console.log('★else [usecase]:', $1, ' [line]:', $2);
        }
    }
    ;

line
	: scenario { 
        $$ = $1;
        console.log('★[line] is [scenario]:', $1);
    }
	| NL { $$='nl'; }
	;

scenario
    : object '---' object {
        console.log('★[scenario]:', $1, $2, $3);
    }
    ;



%%