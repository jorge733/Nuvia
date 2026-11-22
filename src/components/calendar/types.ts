export type CalItem = {
  key: string;
  title: string;
  start: Date;
  end: Date | null;
  allDay: boolean;
  day: string;
  color: string;
  href: string | null;
  done: boolean;
  emoji: string;
};
