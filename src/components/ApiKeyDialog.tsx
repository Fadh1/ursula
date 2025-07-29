import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react'
import { AIModel } from '@/types/ai-models'
import { aiService } from '@/services/ai-service'
import { useToast } from '@/hooks/use-toast'

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableModels: AIModel[]
}

export function ApiKeyDialog({ open, onOpenChange, availableModels }: ApiKeyDialogProps) {
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [validating, setValidating] = useState<Record<string, boolean>>({})
  const [validated, setValidated] = useState<Record<string, boolean>>({})
  const { toast } = useToast()

  const providers = Array.from(new Set(availableModels.map(m => m.provider)))

  const handleValidateKey = async (provider: string) => {
    const key = apiKeys[provider]
    if (!key) return

    setValidating({ ...validating, [provider]: true })
    
    const model = availableModels.find(m => m.provider === provider)
    if (!model) return

    try {
      const isValid = await aiService.validateAPIKey(model, key)
      
      if (isValid) {
        setValidated({ ...validated, [provider]: true })
        toast({
          title: 'Success',
          description: `${getProviderName(provider)} API key validated successfully`,
        })
      } else {
        toast({
          title: 'Invalid API Key',
          description: 'Please check your API key and try again',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Validation Failed',
        description: 'Could not validate API key',
        variant: 'destructive',
      })
    } finally {
      setValidating({ ...validating, [provider]: false })
    }
  }

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI'
      case 'anthropic':
        return 'Anthropic'
      case 'google':
        return 'Google'
      default:
        return provider
    }
  }

  const getProviderUrl = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'https://platform.openai.com/api-keys'
      case 'anthropic':
        return 'https://console.anthropic.com/settings/keys'
      case 'google':
        return 'https://makersuite.google.com/app/apikeys'
      default:
        return '#'
    }
  }

  const hasAnyValidKey = Object.values(validated).some(v => v)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Configure API Keys</DialogTitle>
          <DialogDescription>
            Add your API keys to enable AI models. Your keys are stored locally and never sent to our servers.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={providers[0]} className="w-full">
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${providers.length}, 1fr)` }}>
            {providers.map(provider => (
              <TabsTrigger key={provider} value={provider} className="flex items-center gap-1">
                {getProviderName(provider)}
                {validated[provider] && <CheckCircle size={14} className="text-green-500" />}
              </TabsTrigger>
            ))}
          </TabsList>

          {providers.map(provider => (
            <TabsContent key={provider} value={provider} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`${provider}-key`}>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id={`${provider}-key`}
                    type="password"
                    placeholder={`Enter your ${getProviderName(provider)} API key`}
                    value={apiKeys[provider] || ''}
                    onChange={(e) => setApiKeys({ ...apiKeys, [provider]: e.target.value })}
                    disabled={validating[provider]}
                  />
                  <Button
                    onClick={() => handleValidateKey(provider)}
                    disabled={!apiKeys[provider] || validating[provider]}
                    variant={validated[provider] ? 'secondary' : 'default'}
                  >
                    {validating[provider] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : validated[provider] ? (
                      'Validated'
                    ) : (
                      'Validate'
                    )}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Need an API key? 
                  <a 
                    href={getProviderUrl(provider)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-1 inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Get one from {getProviderName(provider)}
                    <ExternalLink size={12} />
                  </a>
                </AlertDescription>
              </Alert>

              {validated[provider] && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    API key validated successfully! You can now use {getProviderName(provider)} models.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            disabled={!hasAnyValidKey}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}