import { z } from 'zod';
import * as schemas from '../schemas';

export type User = z.infer<typeof schemas.UserSchema>;
export type CreateUser = z.infer<typeof schemas.CreateUserSchema>;
export type UpdateUser = z.infer<typeof schemas.UpdateUserSchema>;

export type Story = z.infer<typeof schemas.StorySchema>;
export type CreateStory = z.infer<typeof schemas.CreateStorySchema>;
export type UpdateStory = z.infer<typeof schemas.UpdateStorySchema>;
export type StoryStatus = z.infer<typeof schemas.StoryStatusSchema>;
export type StoryVisibility = z.infer<typeof schemas.StoryVisibilitySchema>;
export type StoryType = z.infer<typeof schemas.StoryTypeSchema>;
export type StoryGenre = z.infer<typeof schemas.StoryGenreSchema>;

export type Collaboration = z.infer<typeof schemas.CollaborationSchema>;
export type CollaborationRole = z.infer<typeof schemas.CollaborationRoleSchema>;

export type Card = z.infer<typeof schemas.CardSchema>;
export type CreateCard = z.infer<typeof schemas.CreateCardSchema>;
export type UpdateCard = z.infer<typeof schemas.UpdateCardSchema>;
export type CardType = z.infer<typeof schemas.CardTypeSchema>;
export type AttributeDefinition = z.infer<typeof schemas.AttributeDefinitionSchema>;
export type CardRole = z.infer<typeof schemas.CardRoleSchema>;

export type Event = z.infer<typeof schemas.EventSchema>;
export type CreateEvent = z.infer<typeof schemas.CreateEventSchema>;
export type UpdateEvent = z.infer<typeof schemas.UpdateEventSchema>;
export type EventType = z.infer<typeof schemas.EventTypeSchema>;
export type EventIntensity = z.infer<typeof schemas.EventIntensitySchema>;
export type EventVisibility = z.infer<typeof schemas.EventVisibilitySchema>;

export type Timeline = z.infer<typeof schemas.TimelineSchema>;
export type TimelineConfig = z.infer<typeof schemas.TimelineConfigSchema>;
export type TimelinePath = z.infer<typeof schemas.TimelinePathSchema>;

export type Note = z.infer<typeof schemas.NoteSchema>;
export type CreateNote = z.infer<typeof schemas.CreateNoteSchema>;
export type UpdateNote = z.infer<typeof schemas.UpdateNoteSchema>;
export type NoteRelationType = z.infer<typeof schemas.NoteRelationTypeSchema>;

export type Comment = z.infer<typeof schemas.CommentSchema>;
export type CreateComment = z.infer<typeof schemas.CreateCommentSchema>;

export type Suggestion = z.infer<typeof schemas.SuggestionSchema>;
export type CreateSuggestion = z.infer<typeof schemas.CreateSuggestionSchema>;
export type SuggestionAction = z.infer<typeof schemas.SuggestionActionSchema>;
export type SuggestionTarget = z.infer<typeof schemas.SuggestionTargetSchema>;

export type Tag = z.infer<typeof schemas.TagSchema>;
export type GlobalTag = z.infer<typeof schemas.GlobalTagSchema>;

export type AnalysisReport = z.infer<typeof schemas.AnalysisReportSchema>;
export type AnalysisType = z.infer<typeof schemas.AnalysisTypeSchema>;
export type AnalysisScope = z.infer<typeof schemas.AnalysisScopeSchema>;

export type EventCardLink = z.infer<typeof schemas.EventCardLinkSchema>;
export type EventEventLink = z.infer<typeof schemas.EventEventLinkSchema>;
export type NoteNoteLink = z.infer<typeof schemas.NoteNoteLinkSchema>;
export type EventRelationshipType = z.infer<typeof schemas.EventRelationshipTypeSchema>;
