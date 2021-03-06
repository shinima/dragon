import * as invariant from 'invariant'
import { literal, Reg } from 'scanning/Reg'
import { AcceptAction, defaultAcceptAction, FiniteAutomatonSimulator } from 'scanning/common'
import DFA from 'scanning/DFA'
import NFA from 'scanning/NFA'
import NFASimulator from 'scanning/NFASimulator'
import DFASimulator from 'scanning/DFASimulator'

export class Lexer<T> {
  readonly simulator: FiniteAutomatonSimulator<T>

  constructor(simulator: FiniteAutomatonSimulator<T>) {
    this.simulator = simulator
  }

  lex(input: string) {
    return this.simulator.tokens(input)
  }
}

export class LexerBuilder<T> {
  private declarations = new Map<string, NFA<T>>()
  private nfas: NFA<T>[] = []

  addDeclaration(name: string, reg: Reg | string): this {
    this.declarations.set(name, NFA.fromReg(reg, undefined, this.declarations))
    return this
  }

  addRule(content: string, acceptAction: AcceptAction<T> = defaultAcceptAction): this {
    if (content.startsWith('{')) {
      invariant(content.endsWith('}'), 'When using reg-ref as a rule, rule name must be wrapped in curly braces')
      const regRefName = content.substring(1, content.length - 1)
      invariant(this.declarations.has(regRefName), `${regRefName} is not declared`)
      const nfa = this.declarations.get(regRefName)!
      this.nfas.push(NFA.replaceAcceptAction(nfa, acceptAction))
    } else {
      this.nfas.push(NFA.fromReg(literal(content), acceptAction))
    }
    return this
  }

  addReservedWords(words: string[], acceptFactory: AcceptAction<T>): this {
    for (const word of words) {
      this.addRule(word, () => acceptFactory(word))
    }
    return this
  }

  build(simulatorType: 'nfa' | 'dfa'): Lexer<T> {
    const nfa = NFA.mergeNFAs(...this.nfas)
    if (simulatorType === 'nfa') {
      return new Lexer(new NFASimulator(nfa))
    } else {
      return new Lexer(new DFASimulator(DFA.fromNFA(nfa)))
    }
  }
}
