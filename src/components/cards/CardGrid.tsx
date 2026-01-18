import { Card } from '@/domain/types';
import CardGridItem from './CardGridItem';

export default function CardGrid({
    cards,
    onCardClick,
}: {
    cards: Card[];
    onCardClick: (card: Card) => void;
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {cards.map((card) => (
                <CardGridItem
                    key={card.id}
                    card={card}
                    onClick={() => onCardClick(card)}
                />
            ))}
        </div>
    );
}
