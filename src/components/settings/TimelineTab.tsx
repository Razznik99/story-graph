
'use client';

import { useState, useEffect } from 'react';
import { useStoryStore } from '@/store/useStoryStore'; // Verified path
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Save, AlertTriangle, Check, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface ApiTimelineConfig {
    id: string;
    storyId: string;
    timelineType: 'single' | 'multi';
    level1Name: string;
    level2Name: string | null;
    level3Name: string | null;
    level3Persist: boolean;
    level4Name: string | null;
    level4Persist: boolean;
    level5Name: string;
    level5Persist: boolean;
    confirmed: boolean;
}

export default function TimelineTab() {
    const storyId = useStoryStore(state => state.selectedStoryId);

    const [isEditing, setIsEditing] = useState(false);
    const [existingConfig, setExistingConfig] = useState<ApiTimelineConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Timeline config state
    const [timelineType, setTimelineType] = useState<'single' | 'multi'>('single');
    const [config, setConfig] = useState({
        level1Name: 'Book',
        level2Enabled: true,
        level2Name: 'Volume',
        level3Enabled: true,
        level3Name: 'Section',
        level3Persist: false,
        level4Enabled: true,
        level4Name: 'Part',
        level4Persist: false,
        level5Name: 'Chapter',
        level5Persist: false,
    });

    useEffect(() => {
        if (!storyId) {
            setIsLoading(false);
            return;
        }

        const fetchConfig = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/timeline-config?storyId=${storyId}`);
                if (response.ok) {
                    const data: ApiTimelineConfig = await response.json();
                    if (data) {
                        setExistingConfig(data);
                        setTimelineType(data.timelineType);
                        setConfig({
                            level1Name: data.level1Name,
                            level2Enabled: !!data.level2Name,
                            level2Name: data.level2Name || 'Volume',
                            level3Enabled: !!data.level3Name,
                            level3Name: data.level3Name || 'Section',
                            level3Persist: data.level3Persist,
                            level4Enabled: !!data.level4Name,
                            level4Name: data.level4Name || 'Part',
                            level4Persist: data.level4Persist,
                            level5Name: data.level5Name,
                            level5Persist: data.level5Persist,
                        });
                        // If already confirmed, we are not in simple editing mode initially?
                        // Actually, we can edit, but save triggers warning.
                        setIsEditing(!data.confirmed);
                    } else {
                        setExistingConfig(null);
                        setIsEditing(true);
                    }
                } else {
                    // Likely 404 if not exists
                    setExistingConfig(null);
                    setIsEditing(true);
                }
            } catch (error) {
                console.error('Failed to fetch timeline config:', error);
                toast.error('Failed to load timeline configuration');
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfig();
    }, [storyId]);

    // Preview path
    const previewPath = [
        config.level1Name,
        config.level2Enabled && config.level2Name,
        config.level3Enabled && config.level3Name,
        config.level4Enabled && config.level4Name,
        config.level5Name,
    ].filter(Boolean);

    const handleInputChange = (field: string, value: string | boolean) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    // --- Confirmation Modal State ---
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleSaveClick = () => {
        if (existingConfig && existingConfig.confirmed) {
            setIsConfirmOpen(true);
        } else {
            handleSave();
        }
    };

    const handleConfirmSave = async () => {
        setIsConfirmOpen(false);
        await handleSave();
    };

    const handleSave = async () => {
        if (!storyId) return;
        setIsSaving(true);

        const apiPayload = {
            storyId,
            timelineType,
            level1Name: config.level1Name,
            level2Name: config.level2Enabled ? config.level2Name : null,
            level3Name: config.level3Enabled ? config.level3Name : null,
            level3Persist: config.level3Persist,
            level4Name: config.level4Enabled ? config.level4Name : null,
            level4Persist: config.level4Persist,
            level5Name: config.level5Name,
            level5Persist: config.level5Persist,
            confirmed: true,
        };

        try {
            let response;
            if (existingConfig) {
                // Update existing config: destructive action potentially
                response = await fetch('/api/timeline-config', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiPayload),
                });
            } else {
                // Create new config
                response = await fetch('/api/timeline-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(apiPayload),
                });

                // Trigger the "init" logic via PUT immediately if created
                if (response.ok) {
                    await fetch('/api/timeline-config', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(apiPayload),
                    });
                }
            }

            if (response && response.ok) {
                const savedConfig = await response.json();
                setExistingConfig(savedConfig);
                setIsEditing(false);
                toast.success("Timeline configuration saved successfully");
            } else if (response) {
                const errorData = await response.json();
                toast.error(`Error: ${errorData.error}`);
            }
        } catch (error) {
            console.error('Failed to save timeline config:', error);
            toast.error('An unexpected error occurred while saving.');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-text-primary">Timeline Structure</h2>
                    <p className="text-sm text-text-secondary mt-1">Define how your story creates hierarchy (e.g. Books, Chapters, Scenes).</p>
                </div>

                {!isEditing && existingConfig && (
                    <Button onClick={() => setIsEditing(true)} variant="outline">
                        Edit Structure
                    </Button>
                )}
            </div>

            {/* Preview Section */}
            <section className="bg-surface rounded-xl border border-border p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">Structure Preview</h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {previewPath.map((item, index) => (
                        <div key={index} className="flex items-center">
                            <div className="bg-background px-4 py-2 rounded-md border border-border font-medium text-text-primary shadow-sm min-w-[3rem] text-center">
                                {item}
                            </div>
                            {index < previewPath.length - 1 && (
                                <ArrowRight className="h-4 w-4 text-text-muted mx-2" />
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {isEditing && (
                <div className="space-y-8">
                    {/* Type Selection */}
                    <section className="space-y-4">
                        <h3 className="text-base font-medium text-text-primary">Timeline Type</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div
                                className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${timelineType === 'single' ? 'border-accent bg-accent/5' : 'border-border hover:border-text-secondary bg-surface'}`}
                                onClick={() => setTimelineType('single')}
                            >
                                <div className="font-semibold text-text-primary flex items-center gap-2">
                                    Single Ending
                                    {timelineType === 'single' && <Check className="h-4 w-4 text-accent" />}
                                </div>
                                <p className="text-sm text-text-secondary mt-1">Linear progression with one definitive conclusion.</p>
                            </div>
                            <div
                                className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${timelineType === 'multi' ? 'border-accent bg-accent/5' : 'border-border hover:border-text-secondary bg-surface'} opacity-60`}
                            // onClick={() => setTimelineType('multi')} 
                            >
                                <div className="font-semibold text-text-primary flex items-center gap-2">
                                    Multi Ending <span className="text-xs bg-muted px-2 py-0.5 rounded text-text-muted">Soon</span>
                                </div>
                                <p className="text-sm text-text-secondary mt-1">Branching paths leading to various outcomes.</p>
                            </div>
                        </div>
                    </section>

                    {/* Hierachy Config */}
                    <section className="space-y-6">
                        <h3 className="text-base font-medium text-text-primary">Hierarchy Levels</h3>
                        <div className="bg-surface rounded-xl border border-border divide-y divide-border">
                            {/* Level 1 */}
                            <div className="p-4 flex items-center gap-4">
                                <div className="w-24 text-sm font-medium text-text-secondary">Level 1</div>
                                <div className="flex-1">
                                    <Input
                                        value={config.level1Name}
                                        onChange={(e) => handleInputChange('level1Name', e.target.value)}
                                        placeholder="e.g. Book"
                                        className="bg-surface border-border focus-within:ring-accent"
                                    />
                                </div>
                                <div className="w-32 text-xs text-text-muted text-right">Required root</div>
                            </div>

                            {/* Level 2 */}
                            <div className="p-4 flex items-center gap-4">
                                <div className="w-24 flex items-center gap-2">
                                    <Switch
                                        checked={config.level2Enabled}
                                        onCheckedChange={(c) => handleInputChange('level2Enabled', c)}
                                    />
                                    <span className={`text-sm font-medium ${config.level2Enabled ? 'text-text-primary' : 'text-text-muted'}`}>Level 2</span>
                                </div>
                                <div className="flex-1">
                                    <Input
                                        value={config.level2Name}
                                        onChange={(e) => handleInputChange('level2Name', e.target.value)}
                                        disabled={!config.level2Enabled}
                                        placeholder="e.g. Volume"
                                        className="bg-surface border-border focus-within:ring-accent"
                                    />
                                </div>
                                <div className="w-32"></div>
                            </div>

                            {/* Level 3 */}
                            <div className="p-4 flex items-center gap-4">
                                <div className="w-24 flex items-center gap-2">
                                    <Switch
                                        checked={config.level3Enabled}
                                        onCheckedChange={(c) => handleInputChange('level3Enabled', c)}
                                    />
                                    <span className={`text-sm font-medium ${config.level3Enabled ? 'text-text-primary' : 'text-text-muted'}`}>Level 3</span>
                                </div>
                                <div className="flex-1">
                                    <Input
                                        value={config.level3Name}
                                        onChange={(e) => handleInputChange('level3Name', e.target.value)}
                                        disabled={!config.level3Enabled}
                                        placeholder="e.g. Section"
                                        className="bg-surface border-border focus-within:ring-accent"
                                    />
                                </div>
                                <div className="w-32 flex items-center justify-end gap-2">
                                    <Switch
                                        checked={config.level3Persist}
                                        onCheckedChange={(c) => handleInputChange('level3Persist', c)}
                                        disabled={!config.level3Enabled}
                                        id="l3-persist"
                                    />
                                    <Label htmlFor="l3-persist" className="text-xs text-text-muted">Persist #</Label>
                                </div>
                            </div>

                            {/* Level 4 */}
                            <div className="p-4 flex items-center gap-4">
                                <div className="w-24 flex items-center gap-2">
                                    <Switch
                                        checked={config.level4Enabled}
                                        onCheckedChange={(c) => handleInputChange('level4Enabled', c)}
                                    />
                                    <span className={`text-sm font-medium ${config.level4Enabled ? 'text-text-primary' : 'text-text-muted'}`}>Level 4</span>
                                </div>
                                <div className="flex-1">
                                    <Input
                                        value={config.level4Name}
                                        onChange={(e) => handleInputChange('level4Name', e.target.value)}
                                        disabled={!config.level4Enabled}
                                        placeholder="e.g. Part"
                                        className="bg-surface border-border focus-within:ring-accent"
                                    />
                                </div>
                                <div className="w-32 flex items-center justify-end gap-2">
                                    <Switch
                                        checked={config.level4Persist}
                                        onCheckedChange={(c) => handleInputChange('level4Persist', c)}
                                        disabled={!config.level4Enabled}
                                        id="l4-persist"
                                    />
                                    <Label htmlFor="l4-persist" className="text-xs text-text-muted">Persist #</Label>
                                </div>
                            </div>

                            {/* Level 5 */}
                            <div className="p-4 flex items-center gap-4">
                                <div className="w-24 text-sm font-medium text-text-secondary">Level 5</div>
                                <div className="flex-1">
                                    <Input
                                        value={config.level5Name}
                                        onChange={(e) => handleInputChange('level5Name', e.target.value)}
                                        placeholder="e.g. Chapter"
                                        className="bg-surface border-border focus-within:ring-accent"
                                    />
                                </div>
                                <div className="w-32 flex items-center justify-end gap-2">
                                    <Switch
                                        checked={config.level5Persist}
                                        onCheckedChange={(c) => handleInputChange('level5Persist', c)}
                                        id="l5-persist"
                                    />
                                    <Label htmlFor="l5-persist" className="text-xs text-text-muted">Persist #</Label>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-text-muted ml-2">
                            * <strong>Persist #:</strong> Numbering continues across parent boundaries (e.g. Ch 5 follows Ch 4 even in a new Volume).
                        </p>
                    </section>

                    <div className="flex justify-end pt-4">
                        <Button className="bg-accent hover:bg-accent-hover" onClick={handleSaveClick} disabled={isSaving || !storyId}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Configuration
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-error">
                            <AlertTriangle className="h-5 w-5" />
                            Warning: Structural Reset
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            Saving this configuration will <strong>reset your entire timeline structure</strong>.
                            <br /><br />
                            All existing events will be moved to the root level ("{config.level1Name}").
                            You will need to reorganize them into the new chapters/sections.
                            <br /><br />
                            This action cannot be undone. Are you sure?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmSave} disabled={isSaving}>
                            {isSaving ? 'Resetting...' : 'Yes, Reset & Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
