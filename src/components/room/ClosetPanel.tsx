import { useRouter } from "next/router";
import { useState } from "react";
import clsx from "clsx";

import { Character, PetSprite, PixelAvatar, PixelIcon } from "@/components/pixel/PixelSprite";
import { playSfx } from "@/utils/audio/audio-engine";
import type { ClosetHatView, ClosetPetView, ClosetView } from "@/utils/closet-types";

interface ClosetPanelProps {
  closet: ClosetView;
  hairKey: string;
  coins: number;
}

/**
 * 옷장: 코인으로 모자를 사고, 보스를 쓰러뜨려 만난 펫을 데려간다. 겉모습만 바뀌고 점수에는 영향이 없다.
 */
export function ClosetPanel({ closet, hairKey, coins }: ClosetPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const pet = closet.pets.find((item) => item.equipped);
  const ownedPetCount = closet.pets.filter((item) => item.owned).length;

  /**
   * 서버에 요청을 보내고 실패하면 한국어 안내를 보여 준다. 성공하면 화면 데이터를 새로 읽는다.
   */
  async function send(key: string, url: string, body: unknown, done: string, sound: "buy" | "pop" | "toggle"): Promise<void> {
    setBusy(key);
    setMessage(null);
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        playSfx("wrong");
        setMessage({ tone: "error", text: payload?.message ?? "잠시 후 다시 해 주세요." });
        return;
      }
      playSfx(sound);
      setMessage({ tone: "ok", text: done });
      void router.replace(router.asPath, undefined, { scroll: false });
    } catch {
      setMessage({ tone: "error", text: "네트워크 연결을 확인해 주세요." });
    } finally {
      setBusy(null);
    }
  }

  const buyHat = (hat: ClosetHatView) => send(`buy-${hat.key}`, "/api/shop", { itemKey: hat.purchaseKey }, `${hat.name}을(를) 샀어요! 써 볼까요?`, "buy");
  const wearHat = (hat: ClosetHatView | null) =>
    send(hat ? `hat-${hat.key}` : "hat-off", "/api/closet/equip", { slot: "hat", key: hat?.key ?? null }, hat ? `${hat.name}을(를) 썼어요!` : "모자를 벗었어요.", hat ? "pop" : "toggle");
  const walkPet = (target: ClosetPetView | null) =>
    send(target ? `pet-${target.key}` : "pet-off", "/api/closet/equip", { slot: "pet", key: target?.key ?? null }, target ? `${target.name}와(과) 함께 다녀요!` : "펫이 쉬러 갔어요.", target ? "pop" : "toggle");

  return (
    <section aria-labelledby="closet-title" className="panel pf closet">
      <h2 className="panel__title" id="closet-title">
        <PixelIcon name="star" />
        <span>
          <span className="panel__eyebrow">코인으로 사고, 보스를 이겨 친구를 만나요</span>
          옷장
        </span>
        <PixelIcon name="star" />
      </h2>

      <div className="closet__preview card card--mint pf">
        <Character hairKey={hairKey} hatKey={closet.hatKey} name="hero" scale={2.4} />
        {pet ? <PetSprite art={pet.art} className="closet__pet" label={`펫 ${pet.name}`} scale={2.2} sprite={pet.sprite} /> : null}
      </div>

      <h3 className="closet__sub">모자</h3>
      <ul className="closet__grid">
        {closet.hats.map((hat) => {
          const affordable = coins >= hat.cost;

          return (
            <li className={clsx("closet__item card pf", hat.equipped && "closet__item--on")} key={hat.key}>
              <PixelAvatar hairKey={hairKey} hatKey={hat.key} scale={1.6} />
              <strong>{hat.name}</strong>
              <span className="muted">{hat.description}</span>
              {hat.owned ? (
                <button
                  className={clsx("btn btn--small btn--block", hat.equipped ? "btn--cream" : "btn--gold")}
                  data-sfx="none"
                  disabled={busy !== null}
                  onClick={() => void wearHat(hat.equipped ? null : hat)}
                  type="button"
                >
                  {hat.equipped ? "벗기" : "쓰기"}
                </button>
              ) : (
                <button className="btn btn--small btn--gold btn--block" data-sfx="none" disabled={busy !== null || !affordable} onClick={() => void buyHat(hat)} type="button">
                  <PixelIcon name="coin" /> {hat.cost}
                  {affordable ? " 사기" : " · 코인 부족"}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <h3 className="closet__sub">
        펫 친구 <span className="muted">{ownedPetCount} / {closet.pets.length}마리</span>
      </h3>
      <ul className="closet__grid">
        {closet.pets.map((item) => (
          <li className={clsx("closet__item card pf", item.equipped && "closet__item--on", !item.owned && "closet__item--locked")} key={item.key}>
            <PetSprite art={item.art} className={clsx(!item.owned && "closet__silhouette")} scale={1.4} sprite={item.sprite} ui />
            <strong>{item.owned ? item.name : "???"}</strong>
            {item.owned ? null : <span className="muted">{item.hint}</span>}
            {item.owned ? (
              <button
                className={clsx("btn btn--small btn--block", item.equipped ? "btn--cream" : "btn--gold")}
                data-sfx="none"
                disabled={busy !== null}
                onClick={() => void walkPet(item.equipped ? null : item)}
                type="button"
              >
                {item.equipped ? "쉬게 하기" : "데려가기"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {message ? (
        <p className={clsx("msg", message.tone === "error" ? "msg--error" : "msg--ok")} role="status">
          {message.text}
        </p>
      ) : null}
      <p className="panel__foot muted">꾸미기는 겉모습만 바꿔요. 점수·레벨에는 영향이 없어요. 보스 보상은 학교 화면에서 받아요.</p>
    </section>
  );
}
