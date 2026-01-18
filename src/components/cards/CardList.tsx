import { Card } from '@/domain/types';
import CardListItem from './CardListItem';

export default function CardList({
    cards,
    onCardClick,
    onEdit,
}: {
    cards: Card[];
    onCardClick: (card: Card) => void;
    onEdit: (card: Card) => void;
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
