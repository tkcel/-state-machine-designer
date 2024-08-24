"use client"

import dynamic from 'next/dynamic'
import React, { useState, useEffect, useRef } from 'react'

const DynamicMermaidRenderer = dynamic(
  () => import('./MermaidRenderer'),
  { ssr: false }
)

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Pencil, Trash2, ArrowRight, Copy, FileDown, Plus, RefreshCw } from 'lucide-react'
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"



interface State {
  name: string;
  description: string;
  type: string;
  initialValue: string;
}

interface Transition {
  from: string;
  to: string;
  label: string;
}

interface SideEffect {
  name: string;
  description: string;
  states: string[];
}

const initialStateMachine = {
  name: "自動販売機ステートマシン",
  description: "このステートマシンは、自動販売機の基本的な動作を表現しています。",
  states: [
    {
      name: "待機中",
      description: "自動販売機が待機状態にあり、お金の投入を待っています。",
      type: "type Waiting = { totalMoney: number; }",
      initialValue: "{ totalMoney: 0 }"
    },
    {
      name: "お金投入済み",
      description: "お金が投入され、商品選択を待っている状態です。",
      type: "type MoneyInserted = { totalMoney: number; }",
      initialValue: "{ totalMoney: 100 }"
    },
    {
      name: "商品選択済み",
      description: "商品が選択され、在庫確認中の状態です。",
      type: "type ProductSelected = { totalMoney: number; selectedProduct: string; }",
      initialValue: "{ totalMoney: 100, selectedProduct: 'コーラ' }"
    },
    {
      name: "商品出荷中",
      description: "選択された商品を出荷している状態です。",
      type: "type DispensingProduct = { totalMoney: number; selectedProduct: string; }",
      initialValue: "{ totalMoney: 100, selectedProduct: 'コーラ' }"
    }
  ],
  transitions: [
    { from: "待機中", to: "お金投入済み", label: "お金を入れる" },
    { from: "お金投入済み", to: "商品選択済み", label: "商品を選択" },
    { from: "商品選択済み", to: "商品出荷中", label: "在庫あり" },
    { from: "商品選択済み", to: "お金投入済み", label: "在庫なし" },
    { from: "商品出荷中", to: "待機中", label: "商品を取り出す" },
    { from: "お金投入済み", to: "待機中", label: "キャンセル" }
  ],
  sideEffects: [
    {
      name: "売上記録",
      description: "商品が出荷されたときに売上を記録します。",
      states: ["商品出荷中"]
    }
  ]
}

export default function StateMachineDesigner() {
  const [stateMachineName, setStateMachineName] = useState<string>(initialStateMachine.name)
  const [stateMachineDescription, setStateMachineDescription] = useState<string>(initialStateMachine.description)
  const [states, setStates] = useState<State[]>(initialStateMachine.states)
  const [transitions, setTransitions] = useState<Transition[]>(initialStateMachine.transitions)
  const [sideEffects, setSideEffects] = useState<SideEffect[]>(initialStateMachine.sideEffects)
  const [newState, setNewState] = useState('')
  const [newStateDescription, setNewStateDescription] = useState('')
  const [newStateType, setNewStateType] = useState('')
  const [newStateInitialValue, setNewStateInitialValue] = useState('')
  const [newTransitionFrom, setNewTransitionFrom] = useState('')
  const [newTransitionTo, setNewTransitionTo] = useState('')
  const [newTransitionLabel, setNewTransitionLabel] = useState('')
  const [newSideEffectName, setNewSideEffectName] = useState('')
  const [newSideEffectDescription, setNewSideEffectDescription] = useState('')
  const [newSideEffectStates, setNewSideEffectStates] = useState<string[]>([])
  const [mermaidCode, setMermaidCode] = useState('')
  const [editingState, setEditingState] = useState<State | null>(null)
  const [editingTransition, setEditingTransition] = useState<Transition | null>(null)
  const [editingSideEffect, setEditingSideEffect] = useState<SideEffect | null>(null)
  const [isStateModalOpen, setIsStateModalOpen] = useState(false)
  const [isTransitionModalOpen, setIsTransitionModalOpen] = useState(false)
  const [isSideEffectModalOpen, setIsSideEffectModalOpen] = useState(false)
  const [isSpecModalOpen, setIsSpecModalOpen] = useState(false)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [specMarkdown, setSpecMarkdown] = useState('')
  const [aiPrompt, setAiPrompt] = useState('')
  const specTextAreaRef = useRef<HTMLTextAreaElement>(null)
  const promptTextAreaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const code = `
      stateDiagram-v2
      direction LR
      ${states.map(state => `  ${state.name}: ${state.name}<br><font size="2">${state.description}</font>`).join('\n')}
      ${transitions.map(({ from, to, label }) => `  ${from} --> ${to}: ${label}`).join('\n')}
    `
    setMermaidCode(code)
  }, [states, transitions])

  const addOrUpdateState = () => {
    if (newState) {
      const stateData = {
        name: newState,
        description: newStateDescription,
        type: newStateType,
        initialValue: newStateInitialValue
      }
      if (editingState) {
        setStates(states.map(state => 
          state.name === editingState.name ? stateData : state
        ))
      } else {
        setStates([...states, stateData])
      }
      resetStateForm()
    }
  }

  const resetStateForm = () => {
    setNewState('')
    setNewStateDescription('')
    setNewStateType('')
    setNewStateInitialValue('')
    setEditingState(null)
    setIsStateModalOpen(false)
  }

  const editState = (state: State) => {
    setEditingState(state)
    setNewState(state.name)
    setNewStateDescription(state.description)
    setNewStateType(state.type)
    setNewStateInitialValue(state.initialValue)
    setIsStateModalOpen(true)
  }

  const deleteState = (stateName: string) => {
    setStates(states.filter(state => state.name !== stateName))
    setTransitions(transitions.filter(transition => transition.from !== stateName && transition.to !== stateName))
    setSideEffects(sideEffects.map(effect => ({
      ...effect,
      states: effect.states.filter(state => state !== stateName)
    })))
  }

  const addOrUpdateTransition = () => {
    if (newTransitionFrom && newTransitionTo && newTransitionLabel) {
      if (editingTransition) {
        setTransitions(transitions.map(transition => 
          transition === editingTransition ? { from: newTransitionFrom, to: newTransitionTo, label: newTransitionLabel } : transition
        ))
      } else {
        setTransitions([...transitions, { from: newTransitionFrom, to: newTransitionTo, label: newTransitionLabel }])
      }
      resetTransitionForm()
    }
  }

  const resetTransitionForm = () => {
    setNewTransitionFrom('')
    setNewTransitionTo('')
    setNewTransitionLabel('')
    setEditingTransition(null)
    setIsTransitionModalOpen(false)
  }

  const editTransition = (transition: Transition) => {
    setEditingTransition(transition)
    setNewTransitionFrom(transition.from)
    setNewTransitionTo(transition.to)
    setNewTransitionLabel(transition.label)
    setIsTransitionModalOpen(true)
  }

  const deleteTransition = (transition: Transition) => {
    setTransitions(transitions.filter(t => t !== transition))
  }

  const addOrUpdateSideEffect = () => {
    if (newSideEffectName && newSideEffectDescription && newSideEffectStates.length > 0) {
      const sideEffectData = {
        name: newSideEffectName,
        description: newSideEffectDescription,
        states: newSideEffectStates
      }
      if (editingSideEffect) {
        setSideEffects(sideEffects.map(effect => 
          effect.name === editingSideEffect.name ? sideEffectData : effect
        ))
      } else {
        setSideEffects([...sideEffects, sideEffectData])
      }
      resetSideEffectForm()
    }
  }

  const resetSideEffectForm = () => {
    setNewSideEffectName('')
    setNewSideEffectDescription('')
    setNewSideEffectStates([])
    setEditingSideEffect(null)
    setIsSideEffectModalOpen(false)
  }

  const editSideEffect = (sideEffect: SideEffect) => {
    setEditingSideEffect(sideEffect)
    setNewSideEffectName(sideEffect.name)
    setNewSideEffectDescription(sideEffect.description)
    setNewSideEffectStates(sideEffect.states)
    setIsSideEffectModalOpen(true)
  }

  const deleteSideEffect = (sideEffectName: string) => {
    setSideEffects(sideEffects.filter(effect => effect.name !== sideEffectName))
  }

  const generateSpecMarkdown = () => {
    const markdown = `
# ${stateMachineName}

${stateMachineDescription}

## 状態一覧

${states.map(state => `
### ${state.name}

説明: ${state.description}

型定義:
\`\`\`typescript
${state.type}
\`\`\`

初期値:
\`\`\`typescript
${state.initialValue}
\`\`\`
`).join('\n')}

## 遷移一覧

${transitions.map(transition => `
- ${transition.from} -> ${transition.to}: ${transition.label}
`).join('\n')}

## 副作用一覧

${sideEffects.map(effect => `
### ${effect.name}

説明: ${effect.description}

適用される状態:
${effect.states.map(state => `- ${state}`).join('\n')}
`).join('\n')}

## Mermaidダイアグラム

\`\`\`mermaid
${mermaidCode}
\`\`\`
`
    setSpecMarkdown(markdown)
    setIsSpecModalOpen(true)
  }

  const generateAIPrompt = () => {
    const prompt = `
以下の${stateMachineName}の定義に基づいて、Reactのカスタムフックを作成してください。useReducerを使用して実装してください。

${stateMachineDescription}

状態一覧:
${states.map(state => `
- ${state.name}
  説明: ${state.description}
  型定義:
  ${state.type}
  初期値: ${state.initialValue}
`).join('\n')}

遷移一覧:
${transitions.map(transition => `
- ${transition.from} -> ${transition.to}: ${transition.label}
`).join('\n')}

副作用一覧:
${sideEffects.map(effect => `
- ${effect.name}
  説明: ${effect.description}
  適用される状態: ${effect.states.join(', ')}
`).join('\n')}

要件:
1. TypeScriptを使用してください。
2. useReducerを使用して状態管理を行ってください。
3. 状態の型定義を適切に行ってください。
4. 各遷移に対応するアクションとリデューサーを作成してください。
5. 現在の状態と、各遷移関数を返すカスタムフックを実装してください。
6. 各副作用を、useEffectを使用して実装してください。適用される状態に応じて副作用を実行してください。
7. 必要に応じて、状態変更時の副作用を考慮してください。

このステートマシンを実装するReactカスタムフックのコードを提供してください。
`
    setAiPrompt(prompt)
    setIsPromptModalOpen(true)
  }

  const resetAll = () => {
    setStateMachineName('')
    setStateMachineDescription('')
    setStates([])
    setTransitions([])
    setSideEffects([])
    setIsResetModalOpen(false)
    toast({
      title: "リセットしました",
      description: "ステートマシンが初期状態に戻されました。",
    })
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">ステートマシン設計ツール</h1>
        <Button onClick={() => setIsResetModalOpen(true)} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          リセット
        </Button>
      </div>
      
      <div className="mb-4">
        <Label htmlFor="stateMachineName">ステートマシン名:</Label>
        <Input
          id="stateMachineName"
          value={stateMachineName}
          onChange={(e) => setStateMachineName(e.target.value)}
          className="mb-2"
        />
        <Label htmlFor="stateMachineDescription">概要:</Label>
        <Textarea
          id="stateMachineDescription"
          value={stateMachineDescription}
          onChange={(e) => setStateMachineDescription(e.target.value)}
          className="mb-2"
        />
      </div>

      <div className="mb-4 flex space-x-2">
        <Dialog open={isStateModalOpen} onOpenChange={setIsStateModalOpen}>
          <DialogTrigger asChild>
            <Button>状態を追加</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingState ? '状態を編集' : '状態を追加'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  名前
                </Label>
                <Input
                  id="name"
                  value={newState}
                  onChange={(e) => setNewState(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  説明
                </Label>
                <Textarea
                  id="description"
                  value={newStateDescription}
                  onChange={(e) => setNewStateDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  型
                </Label>
                <div className="col-span-3">
                  <Textarea
                    id="type"
                    value={newStateType}
                    onChange={(e) => setNewStateType(e.target.value)}
                    className="mb-2"
                    rows={4}
                  />
                  <SyntaxHighlighter
                    language="typescript"
                    style={tomorrow}
                    customStyle={{
                      margin: 0,
                      padding: '0.5rem',
                      fontSize: '0.875rem',
                      lineHeight: '1.25rem',
                    }}
                  >
                    {newStateType}
                  </SyntaxHighlighter>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="initialValue" className="text-right">
                  初期値
                </Label>
                <div className="col-span-3">
                  <Input
                    id="initialValue"
                    value={newStateInitialValue}
                    onChange={(e) => setNewStateInitialValue(e.target.value)}
                    className="mb-2"
                  />
                  <SyntaxHighlighter
                    language="typescript"
                    style={tomorrow}
                    customStyle={{
                      margin: 0,
                      padding: '0.5rem',
                      fontSize: '0.875rem',
                      lineHeight: '1.25rem',
                    }}
                  >
                    {newStateInitialValue}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={resetStateForm} variant="outline">
                キャンセル
              </Button>
              <Button onClick={addOrUpdateState}>
                {editingState ? '更新' : '追加'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isTransitionModalOpen} onOpenChange={setIsTransitionModalOpen}>
          <DialogTrigger asChild>
            <Button>遷移を追加</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTransition ? '遷移を編集' : '遷移を追加'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="from" className="text-right">
                  開始状態
                </Label>
                <Select onValueChange={setNewTransitionFrom} value={newTransitionFrom}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="開始状態を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map(state => (
                      <SelectItem key={`from-${state.name}`} value={state.name}>{state.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="to" className="text-right">
                  終了状態
                </Label>
                <Select onValueChange={setNewTransitionTo} value={newTransitionTo}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="終了状態を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map(state => (
                      <SelectItem key={`to-${state.name}`} value={state.name}>{state.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="label" className="text-right">
                  ラベル
                </Label>
                <Input
                  id="label"
                  value={newTransitionLabel}
                  onChange={(e) => setNewTransitionLabel(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={resetTransitionForm} variant="outline">
                キャンセル
              </Button>
              <Button onClick={addOrUpdateTransition}>
                {editingTransition ? '更新' : '追加'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isSideEffectModalOpen} onOpenChange={setIsSideEffectModalOpen}>
          <DialogTrigger asChild>
            <Button>副作用を追加</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSideEffect ? '副作用を編集' : '副作用を追加'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sideEffectName" className="text-right">
                  名前
                </Label>
                <Input
                  id="sideEffectName"
                  value={newSideEffectName}
                  onChange={(e) => setNewSideEffectName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sideEffectDescription" className="text-right">
                  説明
                </Label>
                <Textarea
                  id="sideEffectDescription"
                  value={newSideEffectDescription}
                  onChange={(e) => setNewSideEffectDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  適用される状態
                </Label>
                <div className="col-span-3 space-y-2">
                  {states.map(state => (
                    <div key={state.name} className="flex items-center space-x-2">
                      <Checkbox
                        id={`state-${state.name}`}
                        checked={newSideEffectStates.includes(state.name)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewSideEffectStates([...newSideEffectStates, state.name])
                          } else {
                            setNewSideEffectStates(newSideEffectStates.filter(s => s !== state.name))
                          }
                        }}
                      />
                      <Label htmlFor={`state-${state.name}`}>{state.name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button onClick={resetSideEffectForm} variant="outline">
                キャンセル
              </Button>
              <Button onClick={addOrUpdateSideEffect}>
                {editingSideEffect ? '更新' : '追加'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button onClick={generateSpecMarkdown} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          仕様書を出力
        </Button>

        <Button onClick={generateAIPrompt} variant="outline">
          <FileDown className="mr-2 h-4 w-4" />
          AIプロンプトを出力
        </Button>
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">ステートマシン図:</h2>
        <DynamicMermaidRenderer code={mermaidCode} />
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">状態一覧:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {states.map(state => (
            <div key={state.name} className="border p-4 rounded relative">
              <div className="pr-16">
                <h3 className="font-bold">{state.name}</h3>
                <p className="text-sm text-gray-600">{state.description}</p>
                <SyntaxHighlighter language="typescript" style={tomorrow}>
                  {state.type}
                </SyntaxHighlighter>
                <p className="text-sm"><strong>初期値:</strong></p>
                <SyntaxHighlighter language="typescript" style={tomorrow}>
                  {state.initialValue}
                </SyntaxHighlighter>
              </div>
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => editState(state)}
                  aria-label={`Edit ${state.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteState(state.name)}
                  aria-label={`Delete ${state.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">遷移一覧:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transitions.map((transition, index) => (
            <div key={index} className="border p-4 rounded relative">
              <div className="pr-16">
                <div className="flex items-center justify-between">
                  <span>{transition.from}</span>
                  <ArrowRight className="h-4 w-4 mx-2" />
                  <span>{transition.to}</span>
                </div>
                <p className="mt-2"><strong>ラベル:</strong> {transition.label}</p>
              </div>
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => editTransition(transition)}
                  aria-label={`Edit transition from ${transition.from} to ${transition.to}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteTransition(transition)}
                  aria-label={`Delete transition from ${transition.from} to ${transition.to}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">副作用一覧:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sideEffects.map((effect, index) => (
            <div key={index} className="border p-4 rounded relative">
              <div className="pr-16">
                <h3 className="font-bold">{effect.name}</h3>
                <p className="text-sm text-gray-600">{effect.description}</p>
                <p className="text-sm mt-2"><strong>適用される状態:</strong></p>
                <ul className="list-disc list-inside">
                  {effect.states.map((state, idx) => (
                    <li key={idx} className="text-sm">{state}</li>
                  ))}
                </ul>
              </div>
              <div className="absolute top-2 right-2 flex flex-col gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => editSideEffect(effect)}
                  aria-label={`Edit ${effect.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteSideEffect(effect.name)}
                  aria-label={`Delete ${effect.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isSpecModalOpen} onOpenChange={setIsSpecModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ステートマシン仕様書</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Textarea
              ref={specTextAreaRef}
              value={specMarkdown}
              readOnly
              className="w-full h-[60vh] font-mono text-sm"
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => {
              if (specTextAreaRef.current) {
                specTextAreaRef.current.select();
                document.execCommand('copy');
                toast({
                  title: "コピーしました",
                  description: "仕様書がクリップボードにコピーされました。",
                });
              }
            }}>
              <Copy className="mr-2 h-4 w-4" />
              コピー
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AIプロンプト</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <Textarea
              ref={promptTextAreaRef}
              value={aiPrompt}
              readOnly
              className="w-full h-[60vh] font-mono text-sm"
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={() => {
              if (promptTextAreaRef.current) {
                promptTextAreaRef.current.select();
                document.execCommand('copy');
                toast({
                  title: "コピーしました",
                  description: "AIプロンプトがクリップボードにコピーされました。",
                });
              }
            }}>
              <Copy className="mr-2 h-4 w-4" />
              コピー
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>リセット確認</DialogTitle>
            <DialogDescription>
              全ての内容を初期状態に戻しますか？この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsResetModalOpen(false)} variant="outline">
              キャンセル
            </Button>
            <Button onClick={resetAll} variant="destructive">
              リセット
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className='w-full flex'>
        <span className='ml-auto text-[12px]'>made by tkcel(with v0.dev)</span>
      </div>

      <Toaster />
    </div>
  )
}