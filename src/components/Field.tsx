import { useId, type ReactNode, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface BaseProps {
  label: ReactNode;
  /** Aide contextuelle sous le champ (liée par aria-describedby). */
  hint?: ReactNode;
  /** Message d'erreur inline (aria-describedby + aria-invalid). */
  error?: string | null;
}

function useFieldIds(id: string | undefined, hasHint: boolean, hasError: boolean) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = [hasError ? errorId : null, hasHint ? hintId : null].filter(Boolean).join(' ') || undefined;
  return { fieldId, hintId, errorId, describedBy };
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor}>
      {children}
      {required && (
        <span className="req" aria-hidden="true">
          {' '}
          *
        </span>
      )}
    </label>
  );
}

function Below({ hint, hintId, error, errorId }: { hint?: ReactNode; hintId: string; error?: string | null; errorId: string }) {
  return (
    <>
      {error && (
        <div id={errorId} className="error-text" role="alert">
          {error}
        </div>
      )}
      {hint && (
        <div id={hintId} className="hint">
          {hint}
        </div>
      )}
    </>
  );
}

/** Champ texte / nombre / date avec label lié, aide et erreur inline. */
export function TextField({ label, hint, error, id, required, className, ...rest }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, Boolean(hint), Boolean(error));
  return (
    <div className={`form-row ${error ? 'has-error' : ''} ${className ?? ''}`.replace(/\s+/g, ' ').trim()}>
      <Label htmlFor={fieldId} required={required}>
        {label}
      </Label>
      <input id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} aria-required={required || undefined} required={required} {...rest} />
      <Below hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

export function SelectField({ label, hint, error, id, required, children, className, ...rest }: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, Boolean(hint), Boolean(error));
  return (
    <div className={`form-row ${error ? 'has-error' : ''} ${className ?? ''}`.replace(/\s+/g, ' ').trim()}>
      <Label htmlFor={fieldId} required={required}>
        {label}
      </Label>
      <select id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={describedBy} aria-required={required || undefined} required={required} {...rest}>
        {children}
      </select>
      <Below hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

export function TextAreaField({ label, hint, error, id, required, className, ...rest }: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, Boolean(hint), Boolean(error));
  const mono = className?.includes('mono');
  return (
    <div className={`form-row ${error ? 'has-error' : ''}`.trim()}>
      <Label htmlFor={fieldId} required={required}>
        {label}
      </Label>
      <textarea
        id={fieldId}
        className={mono ? 'mono' : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        required={required}
        {...rest}
      />
      <Below hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}

/** Champ fichier (lecture locale) avec label et aide. */
export function FileField({ label, hint, error, id, ...rest }: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const { fieldId, hintId, errorId, describedBy } = useFieldIds(id, Boolean(hint), Boolean(error));
  return (
    <div className="form-row">
      <Label htmlFor={fieldId}>{label}</Label>
      <input id={fieldId} type="file" aria-describedby={describedBy} {...rest} />
      <Below hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  );
}
