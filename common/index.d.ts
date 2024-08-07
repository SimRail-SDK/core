/**
 * ## SimRail Core SDK
 *
 * %FILE_DESC% #TODO
 *
 * @file
 * @module
 *
 * @author  Niek van Bennekom
 * @since   0.1.0
 * @version 0.1.0
 */

/** Specifies a mutable object. (removes `readonly` keywords) */
export type Mutable<T> = { -readonly [P in keyof T]: T[P]; };

/** Specifies the version of the API. */
export type Version = `${number}.${number}.${number}` | `${number}.${number}.${number}-${string}`;

export function exception(code: string, message: string): Error;
