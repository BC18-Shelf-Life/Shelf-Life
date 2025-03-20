"use client";

import { FoodItem as FoodItemComponent } from "../components/food-item";
import { EmptyState } from "../components/empty-state";
import { useFoodItems } from "../hooks/foodItemContext";
import styles from "./fridge.module.css";

// We no longer need userId as a prop
export function Fridge() {
  const {
    loading,
    foodItems,
    expiringSoon,
    goodItems,
    expiredItems,
    markAsConsumed,
  } = useFoodItems();

  if (loading) {
    return <div className={styles.loadingContainer}>Loading...</div>;
  }

  if (foodItems.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={styles.container}>
      {expiringSoon.length > 0 && (
        <section>
          <h2
            className={`${styles.sectionHeading} ${styles.expiringSoonHeading}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={styles.icon}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Expiring Soon
          </h2>
          <div className={styles.itemsContainer}>
            {expiringSoon.map((item) => (
              <FoodItemComponent
                key={item.id}
                item={item}
                onConsume={markAsConsumed}
                status="expiring"
              />
            ))}
          </div>
        </section>
      )}

      {goodItems.length > 0 && (
        <section>
          <h2 className={`${styles.sectionHeading} ${styles.freshHeading}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={styles.icon}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 0 0 -1.414-1.414L9 10.586 7.707 9.293a1 1 0 0 0 -1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Fresh
          </h2>
          <div className={styles.itemsContainer}>
            {goodItems.map((item) => (
              <FoodItemComponent
                key={item.id}
                item={item}
                onConsume={markAsConsumed}
                status="good"
              />
            ))}
          </div>
        </section>
      )}

      {expiredItems.length > 0 && (
        <section>
          <h2 className={`${styles.sectionHeading} ${styles.expiredHeading}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={styles.icon}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 000 16zM8.707 7.293a1 1 0 0 0-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 1 0 1.414 1.414L10 11.414l1.293 1.293a1 1 0 0 0 1.414-1.414L11.414 10l1.293-1.293a1 1 0 0-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            Expired
          </h2>
          <div className={styles.itemsContainer}>
            {expiredItems.map((item) => (
              <FoodItemComponent
                key={item.id}
                item={item}
                onConsume={markAsConsumed}
                status="expired"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
