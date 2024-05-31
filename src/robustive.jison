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
.+                        return 'LABEL';

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
    : object scenario {
        /* 始まりが決まる*/
        console.log('★beginWith:', $1, $2);
        $$ = { from:$1, scenario: $2 };
    }
    | '---' scenario {
        console.log('★relation:', $1, $2);
        $$ = { reateion: $1, scenario: $2 };
    }
    | '---' object {
        console.log('★relation:', $1, ' with', $2);
        $$ = { reateion: $1, to: $2 };
    }
    ;

object
    : A '[' LABEL ']' {
        console.log('★[object] is [ACTOR]:', $1, $3);
        $$ = { type: $1, name: $3 };
    }
    | B '[' LABEL ']' {
        console.log('★[object] is [object]:', $1, $3);
        $$ = { from: $1, to: $3 };
    }
    | C '[' LABEL ']' {
        console.log('★[object] is [object]:', $1, $3);
        $$ = { from: $1, to: $3 };
    }
    ;

%%