import { Card } from '@/domain/types';
import CardListItem from './CardListItem';

export default function CardList<T extends Card>({
    cards,
    onCardClick,
    onEdit,
}: {
    cards: T[];
    onCardClick: (card: T) => void;
    onEdit: (card: T) => void;
}) {
    return (
        <div className="space-y-3">
            {cards.map((card) => (
                <CardListItem
                    key={card.id}
                    card={card}
                    onClick={() => onCardClick(card)}
                    onEdit={(e) => {
                        e.stopPropagation();
                        onEdit(card);
                    }}
                />
            ))}
        </div>
    );
}
