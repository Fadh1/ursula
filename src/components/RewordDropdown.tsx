import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  Edit3,
  ChevronDown,
  Minimize2,
  Maximize2,
  Palette,
  Zap,
  Heart,
  Users,
  HelpCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { RewordType, ToneType, AudienceType, ActionOptions } from '@/types/ai-models'

interface RewordDropdownProps {
  onRewordSelect: (options: ActionOptions) => void
  isLoading: boolean
  hasModel: boolean
  onPreviewRequest?: (type: RewordType, config?: { tone?: ToneType; audience?: AudienceType }) => void
}

interface RewordOption {
  type: RewordType
  label: string
  description: string
  icon: React.ReactNode
  previewExample?: string
}

const RewordDropdown = ({
  onRewordSelect,
  isLoading,
  hasModel,
  onPreviewRequest
}: RewordDropdownProps) => {
  const [selectedTone, setSelectedTone] = useState<ToneType>('formal')
  const [selectedAudience, setSelectedAudience] = useState<AudienceType>('general')

  const rewordOptions: RewordOption[] = [
    {
      type: 'concise',
      label: 'Make More Concise',
      description: 'Remove unnecessary words while preserving meaning',
      icon: <Minimize2 size={16} />,
      previewExample: 'Shortens text by 20-40% while keeping key points'
    },
    {
      type: 'flesh_out',
      label: 'Flesh Out',
      description: 'Add more detail and explanation',
      icon: <Maximize2 size={16} />,
      previewExample: 'Expands with examples, context, and supporting details'
    },
    {
      type: 'simplify',
      label: 'Simplify Language',
      description: 'Use clearer, more accessible words',
      icon: <Zap size={16} />,
      previewExample: 'Replaces complex terms with simpler alternatives'
    },
    {
      type: 'engaging',
      label: 'Make More Engaging',
      description: 'Add energy and compelling language',
      icon: <Heart size={16} />,
      previewExample: 'Uses active voice and vivid, compelling words'
    }
  ]

  const toneOptions = [
    { value: 'formal' as ToneType, label: 'Formal', description: 'Professional and structured' },
    { value: 'casual' as ToneType, label: 'Casual', description: 'Conversational and relaxed' },
    { value: 'academic' as ToneType, label: 'Academic', description: 'Scholarly and precise' }
  ]

  const audienceOptions = [
    { value: 'general' as AudienceType, label: 'General', description: 'Accessible to everyone' },
    { value: 'technical' as AudienceType, label: 'Technical', description: 'For subject matter experts' }
  ]

  const handleSimpleReword = (type: RewordType) => {
    if (!hasModel || isLoading) return
    onRewordSelect({ rewordType: type })
  }

  const handleToneChange = () => {
    if (!hasModel || isLoading) return
    onRewordSelect({ rewordType: 'tone', tone: selectedTone })
  }

  const handleAudienceChange = () => {
    if (!hasModel || isLoading) return
    onRewordSelect({ rewordType: 'audience', audience: selectedAudience })
  }

  const RewordOptionItem = ({ option }: { option: RewordOption }) => {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuItem
              onClick={() => handleSimpleReword(option.type)}
              disabled={isLoading || !hasModel}
              className="flex items-center gap-3 p-3 cursor-pointer"
            >
              <div className="text-muted-foreground">
                {option.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-muted-foreground">{option.description}</div>
              </div>
            </DropdownMenuItem>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-sm">{option.previewExample}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center gap-3 p-4 h-auto text-left justify-start w-full",
            !hasModel && "opacity-50 cursor-not-allowed"
          )}
          disabled={isLoading || !hasModel}
        >
          <div className="p-2 bg-purple-100 rounded-lg">
            <Edit3 size={20} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium">Reword</div>
            <div className="text-xs text-muted-foreground">Modify style, tone, or structure</div>
          </div>
          <ChevronDown size={16} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80" align="start">
        {/* Simple Reword Options */}
        <div className="px-2 py-1">
          <div className="text-xs font-medium text-muted-foreground mb-2">Quick Options</div>
          {rewordOptions.map((option) => (
            <RewordOptionItem key={option.type} option={option} />
          ))}
        </div>

        <DropdownMenuSeparator />

        {/* Tone Selection */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-3 p-3">
            <Palette size={16} className="text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium text-sm">Change Tone</div>
              <div className="text-xs text-muted-foreground">Adjust writing style</div>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64">
            <div className="p-3 space-y-3">
              <div className="text-xs font-medium">Select Tone:</div>
              <Select value={selectedTone} onValueChange={setSelectedTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((tone) => (
                    <SelectItem key={tone.value} value={tone.value}>
                      <div>
                        <div className="font-medium">{tone.label}</div>
                        <div className="text-xs text-muted-foreground">{tone.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleToneChange}
                disabled={isLoading || !hasModel}
                size="sm" 
                className="w-full"
              >
                Apply Tone Change
              </Button>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Audience Selection */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-3 p-3">
            <Users size={16} className="text-muted-foreground" />
            <div className="flex-1">
              <div className="font-medium text-sm">Adjust for Audience</div>
              <div className="text-xs text-muted-foreground">Match your readers</div>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-64">
            <div className="p-3 space-y-3">
              <div className="text-xs font-medium">Target Audience:</div>
              <Select value={selectedAudience} onValueChange={setSelectedAudience}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {audienceOptions.map((audience) => (
                    <SelectItem key={audience.value} value={audience.value}>
                      <div>
                        <div className="font-medium">{audience.label}</div>
                        <div className="text-xs text-muted-foreground">{audience.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAudienceChange}
                disabled={isLoading || !hasModel}
                size="sm" 
                className="w-full"
              >
                Adjust for Audience
              </Button>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {!hasModel && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 text-xs text-destructive flex items-center gap-2">
              <HelpCircle size={12} />
              Please select an AI model first
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default RewordDropdown