"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SQRT_5000 = Math.sqrt(5000);

interface CardData {
  tempId: number;
  title: string;
  description: string;
  subtitle?: string;
  imgSrc?: string;
  link?: string;
}

interface StaggerCardProps {
  position: number;
  card: CardData;
  handleMove: (steps: number) => void;
  cardSize: number;
}

const StaggerCard: React.FC<StaggerCardProps> = ({
  position,
  card,
  handleMove,
  cardSize,
}) => {
  const isCenter = position === 0;

  const CardContent = (
    <div
      onClick={() => handleMove(position)}
      className={cn(
        "absolute left-1/2 top-1/2 cursor-pointer border-2 p-8 transition-all duration-500 ease-in-out",
        isCenter
          ? "z-10 bg-white text-black border-white"
          : "z-0 bg-[#2A2A2A] text-white border-white/20 hover:border-white/40"
      )}
      style={{
        width: cardSize,
        height: cardSize,
        clipPath: `polygon(50px 0%, calc(100% - 50px) 0%, 100% 50px, 100% 100%, calc(100% - 50px) 100%, 50px 100%, 0 100%, 0 0)`,
        transform: `translate(-50%, -50%) translateX(${
          (cardSize / 1.5) * position
        }px) translateY(${
          isCenter ? -65 : position % 2 ? 15 : -15
        }px) rotate(${isCenter ? 0 : position % 2 ? 2.5 : -2.5}deg)`,
        boxShadow: isCenter
          ? "0px 8px 0px 4px rgba(255, 255, 255, 0.1)"
          : "0px 0px 0px 0px transparent",
      }}
    >
      <span
        className={cn(
          "absolute block origin-top-right rotate-45",
          isCenter ? "bg-black/20" : "bg-white/10"
        )}
        style={{
          right: -2,
          top: 48,
          width: SQRT_5000,
          height: 2,
        }}
      />
      {card.imgSrc && (
        <img
          src={card.imgSrc}
          alt={card.title}
          className={cn(
            "mb-4 h-14 w-12 object-cover object-top",
            isCenter ? "bg-gray-200" : "bg-gray-800"
          )}
          style={{
            boxShadow: isCenter
              ? "3px 3px 0px rgba(0, 0, 0, 0.1)"
              : "3px 3px 0px rgba(255, 255, 255, 0.05)",
          }}
        />
      )}
      <h3
        className={cn(
          "text-base sm:text-xl font-medium mb-2",
          isCenter ? "text-black" : "text-white"
        )}
      >
        {card.title}
      </h3>
      <p
        className={cn(
          "text-sm line-clamp-4",
          isCenter ? "text-black/80" : "text-gray-300"
        )}
      >
        {card.description}
      </p>
      {card.subtitle && (
        <p
          className={cn(
            "absolute bottom-8 left-8 right-8 mt-2 text-sm italic",
            isCenter ? "text-black/70" : "text-gray-400"
          )}
        >
          {card.subtitle}
        </p>
      )}
    </div>
  );

  if (card.link && isCenter) {
    return (
      <a
        href={card.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {CardContent}
      </a>
    );
  }

  return CardContent;
};

interface StaggerCardsProps {
  cards: Omit<CardData, "tempId">[];
  height?: number;
}

export const StaggerCards: React.FC<StaggerCardsProps> = ({
  cards,
  height = 600,
}) => {
  const [cardSize, setCardSize] = useState(365);
  const [cardsList, setCardsList] = useState<CardData[]>(
    cards.map((card, index) => ({ ...card, tempId: index }))
  );

  const handleMove = (steps: number) => {
    const newList = [...cardsList];
    if (steps > 0) {
      for (let i = steps; i > 0; i--) {
        const item = newList.shift();
        if (!item) return;
        newList.push({ ...item, tempId: Math.random() });
      }
    } else {
      for (let i = steps; i < 0; i++) {
        const item = newList.pop();
        if (!item) return;
        newList.unshift({ ...item, tempId: Math.random() });
      }
    }
    setCardsList(newList);
  };

  useEffect(() => {
    const updateSize = () => {
      const { matches } = window.matchMedia("(min-width: 640px)");
      setCardSize(matches ? 365 : 290);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    setCardsList(cards.map((card, index) => ({ ...card, tempId: index })));
  }, [cards]);

  if (cards.length === 0) {
    return null;
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ 
        height,
        maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)'
      }}
    >
      {cardsList.map((card, index) => {
        const position =
          cardsList.length % 2
            ? index - (cardsList.length + 1) / 2
            : index - cardsList.length / 2;
        
        // Render all cards but make far ones invisible for smooth animation
        const isVisible = position >= -2 && position <= 2;
        
        return (
          <div
            key={card.tempId}
            style={{
              opacity: isVisible ? 1 : 0,
              pointerEvents: isVisible ? 'auto' : 'none',
              transition: 'opacity 500ms ease-in-out'
            }}
          >
            <StaggerCard
              card={card}
              handleMove={handleMove}
              position={position}
              cardSize={cardSize}
            />
          </div>
        );
      })}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
        <button
          onClick={() => handleMove(-1)}
          className="flex h-14 w-14 items-center justify-center text-2xl transition-all duration-300 bg-[#2A2A2A] border-2 border-white/20 hover:bg-white hover:text-black text-white rounded-lg hover:scale-110"
          aria-label="Previous card"
        >
          <ChevronLeft />
        </button>
        <button
          onClick={() => handleMove(1)}
          className="flex h-14 w-14 items-center justify-center text-2xl transition-all duration-300 bg-[#2A2A2A] border-2 border-white/20 hover:bg-white hover:text-black text-white rounded-lg hover:scale-110"
          aria-label="Next card"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
};
