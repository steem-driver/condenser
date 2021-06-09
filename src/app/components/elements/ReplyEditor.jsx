import React from 'react';
import PropTypes from 'prop-types';
import reactForm from 'app/utils/ReactForm';
import * as transactionActions from 'app/redux/TransactionReducer';
import * as userActions from 'app/redux/UserReducer';
import MarkdownViewer from 'app/components/cards/MarkdownViewer';
import CategorySelector from 'app/components/cards/CategorySelector';
import { validateCategory } from 'app/components/cards/CategorySelector';
import LoadingIndicator from 'app/components/elements/LoadingIndicator';
import shouldComponentUpdate from 'app/utils/shouldComponentUpdate';
import Tooltip from 'app/components/elements/Tooltip';
import sanitizeConfig, { allowedTags } from 'app/utils/SanitizeConfig';
import sanitize from 'sanitize-html';
import HtmlReady from 'shared/HtmlReady';
import * as globalActions from 'app/redux/GlobalReducer';
import { OrderedSet } from 'immutable';
import Remarkable from 'remarkable';
import Dropzone from 'react-dropzone';
import tt from 'counterpart';
import { DEFAULT_TAGS, APP_MAX_TAG, SCOT_TAGS } from 'app/client_config';
const MAX_FILE_TO_UPLOAD = 10;
let imagesToUpload = [];

const remarkable = new Remarkable({ html: true, linkify: false, breaks: true });

const RTE_DEFAULT = false;
const MAX_TAG = APP_MAX_TAG || 10;

class ReplyEditor extends React.Component {
    static propTypes = {
        // html component attributes
        formId: PropTypes.string.isRequired, // unique form id for each editor
        type: PropTypes.oneOf(['submit_story', 'submit_comment', 'edit']),
        successCallback: PropTypes.func, // indicator that the editor is done and can be hidden
        onCancel: PropTypes.func, // hide editor when cancel button clicked
        author: PropTypes.string, // empty or string for top-level post
        permlink: PropTypes.string, // new or existing category (default calculated from title)
        parent_author: PropTypes.string, // empty or string for top-level post
        parent_permlink: PropTypes.string, // new or existing category
        jsonMetadata: PropTypes.object, // An existing comment has its own meta data
        category: PropTypes.string, // initial value
        title: PropTypes.string, // initial value
        body: PropTypes.string, // initial value
        richTextEditor: PropTypes.func,
        defaultPayoutType: PropTypes.string,
        payoutType: PropTypes.string,
        thumbnail: PropTypes.string,
    };

    static defaultProps = {
        isStory: false,
        author: '',
        parent_author: '',
        parent_permlink: '',
        type: 'submit_comment',
    };

    constructor(props) {
        super();
        this.state = { progress: {} };
        this.initForm(props);
    }

    componentWillMount() {
        const { setMetaData, formId, jsonMetadata } = this.props;
        setMetaData(formId, jsonMetadata);

        if (process.env.BROWSER) {
            // Check for rte editor preference
            let rte =
                this.props.isStory &&
                JSON.parse(
                    localStorage.getItem('replyEditorData-rte') || RTE_DEFAULT
                );
            let raw = null;

            // Process initial body value (if this is an edit)
            const { body } = this.state;
            if (body.value) {
                raw = body.value;
            }

            // Check for draft data
            let draft = localStorage.getItem('replyEditorData-' + formId);
            if (draft) {
                draft = JSON.parse(draft);
                const { category, title } = this.state;
                if (category) category.props.onChange(draft.category);
                if (title) title.props.onChange(draft.title);
                if (draft.payoutType)
                    this.props.setPayoutType(formId, draft.payoutType);
                if (draft.appType) this.props.setAppType(formId, draft.appType);
                raw = draft.body;
            }

            // If we have an initial body, check if it's html or markdown
            if (raw) {
                rte = isHtmlTest(raw);
            }

            // console.log("initial reply body:", raw || '(empty)')
            body.props.onChange(raw);
            this.setState({
                rte,
                rte_value: rte
                    ? stateFromHtml(this.props.richTextEditor, raw)
                    : null,
            });
        }
    }

    componentDidMount() {
        setTimeout(() => {
            if (this.props.isStory) this.refs.titleRef.focus();
            else if (this.refs.postRef) this.refs.postRef.focus();
            else if (this.refs.rte) this.refs.rte._focus();
        }, 300);
    }

    shouldComponentUpdate = shouldComponentUpdate(this, 'ReplyEditor');

    componentWillUpdate(nextProps, nextState) {
        if (process.env.BROWSER) {
            const ts = this.state;
            const ns = nextState;
            const tp = this.props;
            const np = nextProps;

            // Save curent draft to localStorage
            if (
                ts.body.value !== ns.body.value ||
                (ns.category && ts.category.value !== ns.category.value) ||
                (ns.title && ts.title.value !== ns.title.value) ||
                np.payoutType !== tp.payoutType ||
                np.appType !== tp.appType
            ) {
                // also prevents saving after parent deletes this information
                const { formId, payoutType, appType } = np;
                const { category, title, body } = ns;
                const data = {
                    formId,
                    title: title ? title.value : undefined,
                    category: category ? category.value : undefined,
                    body: body.value,
                    payoutType,
                    appType,
                };

                clearTimeout(saveEditorTimeout);
                saveEditorTimeout = setTimeout(() => {
                    // console.log('save formId', formId, body.value)
                    localStorage.setItem(
                        'replyEditorData-' + formId,
                        JSON.stringify(data, null, 0)
                    );
                    this.showDraftSaved();
                }, 500);
            }
        }
    }

    componentWillUnmount() {
        const { clearMetaData, formId } = this.props;
        clearMetaData(formId);
    }

    initForm(props) {
        const { isStory, type, fields } = props;
        const isEdit = type === 'edit';
        const maxKb = isStory ? 65 : 16;
        reactForm({
            fields,
            instance: this,
            name: 'replyForm',
            initialValues: props.initialValues,
            validation: values => ({
                title:
                    isStory &&
                    (!values.title || values.title.trim() === ''
                        ? tt('g.required')
                        : values.title.length > 255
                          ? tt('reply_editor.shorten_title')
                          : null),
                category: isStory && validateCategory(values.category, !isEdit),
                body: !values.body
                    ? tt('g.required')
                    : values.body.length > maxKb * 1024
                      ? tt('reply_editor.exceeds_maximum_length', { maxKb })
                      : null,
            }),
        });
    }

    onTitleChange = e => {
        const value = e.target.value;
        // TODO block links in title (they do not make good permlinks)
        const hasMarkdown = /(?:\*[\w\s]*\*|\#[\w\s]*\#|_[\w\s]*_|~[\w\s]*~|\]\s*\(|\]\s*\[)/.test(
            value
        );
        this.setState({
            titleWarn: hasMarkdown
                ? tt('reply_editor.markdown_not_supported')
                : '',
        });
        const { title } = this.state;
        title.props.onChange(e);
    };

    onCancel = e => {
        if (e) e.preventDefault();
        const { formId, onCancel, defaultPayoutType } = this.props;
        const { replyForm, body } = this.state;
        if (
            !body.value ||
            confirm(tt('reply_editor.are_you_sure_you_want_to_clear_this_form'))
        ) {
            replyForm.resetForm();
            this.setState({
                rte_value: stateFromHtml(this.props.richTextEditor),
            });
            this.setState({ progress: {} });
            this.props.setPayoutType(formId, defaultPayoutType);
            this.props.setAppType(formId, 'steemcn/0.1');
            if (onCancel) onCancel(e);
        }
    };

    // As rte_editor is updated, keep the (invisible) 'body' field in sync.
    onChange = rte_value => {
        this.setState({ rte_value });
        const html = stateToHtml(rte_value);
        const { body } = this.state;
        if (body.value !== html) body.props.onChange(html);
    };

    toggleRte = e => {
        e.preventDefault();
        const state = { rte: !this.state.rte };
        if (state.rte) {
            const { body } = this.state;
            state.rte_value = isHtmlTest(body.value)
                ? stateFromHtml(this.props.richTextEditor, body.value)
                : stateFromMarkdown(this.props.richTextEditor, body.value);
        }
        this.setState(state);
        localStorage.setItem('replyEditorData-rte', !this.state.rte);
    };
    showDraftSaved() {
        const { draft } = this.refs;
        draft.className = 'ReplyEditor__draft';
        void draft.offsetWidth; // reset animation
        draft.className = 'ReplyEditor__draft ReplyEditor__draft-saved';
    }

    showAdvancedSettings = e => {
        e.preventDefault();
        this.props.setPayoutType(this.props.formId, this.props.payoutType);
        this.props.showAdvancedSettings(this.props.formId);
    };

    displayErrorMessage = message => {
        this.setState({
            progress: { error: message },
        });

        setTimeout(() => {
            this.setState({ progress: {} });
        }, 6000); // clear message
    };

    onDrop = (acceptedFiles, rejectedFiles) => {
        if (!acceptedFiles.length) {
            if (rejectedFiles.length) {
                this.displayErrorMessage('Please insert only image files.');
                console.log('onDrop Rejected files: ', rejectedFiles);
            }
            return;
        }
        if (acceptedFiles.length > MAX_FILE_TO_UPLOAD) {
            this.displayErrorMessage(
                `Please upload up to maximum ${MAX_FILE_TO_UPLOAD} images.`
            );
            console.log('onDrop too many files to upload');
            return;
        }

        for (let fi = 0; fi < acceptedFiles.length; fi += 1) {
            const acceptedFile = acceptedFiles[fi];
            const imageToUpload = {
                file: acceptedFile,
                temporaryTag: '',
            };
            imagesToUpload.push(imageToUpload);
        }

        this.insertPlaceHolders();
        this.uploadNextImage();
    };

    onOpenClick = imageName => {
        this.setState({
            imageInProgress: imageName,
        });
        this.dropzone.open();
    };

    onPasteCapture = e => {
        try {
            if (e.clipboardData) {
                for (const item of e.clipboardData.items) {
                    if (item.kind === 'file' && /^image\//.test(item.type)) {
                        const blob = item.getAsFile();
                        imagesToUpload.push({
                            file: blob,
                            temporaryTag: '',
                        });
                    }
                }
                this.insertPlaceHolders();
                this.uploadNextImage();
            } else {
                // http://joelb.me/blog/2011/code-snippet-accessing-clipboard-images-with-javascript/
                // contenteditable element that catches all pasted data
                this.setState({ noClipboardData: true });
            }
        } catch (error) {
            console.error('Error analyzing clipboard event', error);
        }
    };
    uploadNextImage = () => {
        if (imagesToUpload.length > 0) {
            const nextImage = imagesToUpload.pop();
            this.upload(nextImage);
        }
    };

    insertPlaceHolders = () => {
        let { imagesUploadCount } = this.state;
        const { body } = this.state;
        const { selectionStart } = this.refs.postRef;
        let placeholder = '';

        for (let ii = 0; ii < imagesToUpload.length; ii += 1) {
            const imageToUpload = imagesToUpload[ii];

            if (imageToUpload.temporaryTag === '') {
                imagesUploadCount++;
                imageToUpload.temporaryTag = `![Uploading image #${
                    imagesUploadCount
                }...]()`;
                placeholder += `\n${imageToUpload.temporaryTag}\n`;
            }
        }
        this.setState({ imagesUploadCount: imagesUploadCount });

        // Insert the temporary tag where the cursor currently is
        body.props.onChange(
            body.value.substring(0, selectionStart) +
                placeholder +
                body.value.substring(selectionStart, body.value.length)
        );
    };

    upload = image => {
        const { uploadImage } = this.props;
        this.setState({
            progress: { message: tt('reply_editor.uploading') },
        });
        uploadImage(image.file, progress => {
            if (progress.url) {
                this.setState({ progress: {} });
                const { url } = progress;
                const imageMd = `![${image.file.name}](${url})`;
                const image_url = `${url}`;
                let field;
                if (this.state.imageInProgress === 'thumbnail') {
                    field = this.state.thumbnail;
                    field.props.onChange(image_url);
                } else {
                    const { body } = this.state;
                    const { selectionStart, selectionEnd } = this.refs.postRef;
                    body.props.onChange(
                        body.value.replace(image.temporaryTag, imageMd)
                    );
                }
                this.uploadNextImage();
            } else {
                if (progress.hasOwnProperty('error')) {
                    this.displayErrorMessage(progress.error);
                    const imageMd = `![${image.file.name}](UPLOAD FAILED)`;
                    // Remove temporary image MD tag
                    body.props.onChange(
                        body.value.replace(image.temporaryTag, imageMd)
                    );
                } else {
                    this.setState({ progress });
                }
            }
        });
    };

    render() {
        const originalPost = {
            category: this.props.category,
            body: this.props.body,
        };
        const { onCancel, onTitleChange } = this;
        const { title, category, body, thumbnail } = this.state;
        const {
            reply,
            username,
            isStory,
            formId,
            noImage,
            author,
            permlink,
            parent_author,
            parent_permlink,
            type,
            jsonMetadata,
            state,
            successCallback,
            defaultPayoutType,
            payoutType,
            appType,
        } = this.props;
        const {
            submitting,
            valid,
            handleSubmit,
            resetForm,
        } = this.state.replyForm;
        const { postError, titleWarn, rte } = this.state;
        const { progress, noClipboardData } = this.state;
        const disabled = submitting || !valid;
        const loading = submitting || this.state.loading;
        const isEdit = type === 'edit';
        const errorCallback = estr => {
            this.setState({ postError: estr, loading: false });
        };
        const successCallbackWrapper = (...args) => {
            if (!isEdit) {
                resetForm();
            }
            this.setState({ loading: false });
            this.props.setPayoutType(formId, defaultPayoutType);
            this.props.setAppType(formId, 'steemcn/0.1');
            if (successCallback) successCallback(args);
        };
        const isHtml = rte || isHtmlTest(body.value);
        const replyParams = {
            author,
            permlink,
            parent_author,
            parent_permlink,
            type,
            state,
            originalPost,
            isHtml,
            isStory,
            jsonMetadata,
            payoutType,
            appType,
            successCallback: successCallbackWrapper,
            errorCallback,
        };
        const postLabel = username ? (
            <Tooltip t={tt('g.post_as_user', { username })}>
                {tt('g.post')}
            </Tooltip>
        ) : (
            tt('g.post')
        );
        const hasTitleError = title && title.touched && title.error;
        let titleError = null;
        // The Required title error (triggered onBlur) can shift the form making it hard to click on things..
        if (
            (hasTitleError &&
                (title.error !== tt('g.required') || body.value !== '')) ||
            titleWarn
        ) {
            titleError = (
                <div className={hasTitleError ? 'error' : 'warning'}>
                    {hasTitleError ? title.error : titleWarn}&nbsp;
                </div>
            );
        }

        // TODO: remove all references to these vframe classes. Removed from css and no longer needed.
        const vframe_class = isStory ? 'vframe' : '';
        const vframe_section_class = isStory ? 'vframe__section' : '';
        const vframe_section_shrink_class = isStory
            ? 'vframe__section--shrink'
            : '';
        const RichTextEditor = this.props.richTextEditor;

        return (
            <div className="ReplyEditor row">
                <div className="column small-12">
                    <div
                        ref="draft"
                        className="ReplyEditor__draft ReplyEditor__draft-hide"
                    >
                        {tt('reply_editor.draft_saved')}
                    </div>
                    <form
                        className={vframe_class}
                        onSubmit={handleSubmit(({ data }) => {
                            const startLoadingIndicator = () =>
                                this.setState({
                                    loading: true,
                                    postError: undefined,
                                });
                            reply({
                                ...data,
                                ...replyParams,
                                startLoadingIndicator,
                            });
                        })}
                        onChange={() => {
                            this.setState({ postError: null });
                        }}
                    >
                        <div className={vframe_section_shrink_class}>
                            {isStory && (
                                <span>
                                    <input
                                        type="text"
                                        className="ReplyEditor__title"
                                        onChange={onTitleChange}
                                        disabled={loading}
                                        placeholder={tt('reply_editor.title')}
                                        autoComplete="off"
                                        ref="titleRef"
                                        tabIndex={1}
                                        {...title.props}
                                    />
                                    <div
                                        className="float-right secondary"
                                        style={{ marginRight: '1rem' }}
                                    >
                                        {rte && (
                                            <a
                                                href="#"
                                                onClick={this.toggleRte}
                                            >
                                                {body.value
                                                    ? 'Raw HTML'
                                                    : 'Markdown'}
                                            </a>
                                        )}
                                        {!rte &&
                                            (isHtml || !body.value) && (
                                                <a
                                                    href="#"
                                                    onClick={this.toggleRte}
                                                >
                                                    {tt('reply_editor.editor')}
                                                </a>
                                            )}
                                    </div>
                                    {titleError}
                                </span>
                            )}
                        </div>

                        <div
                            className={
                                'ReplyEditor__body ' +
                                (rte
                                    ? `rte ${vframe_section_class}`
                                    : vframe_section_shrink_class)
                            }
                        >
                            {process.env.BROWSER && rte ? (
                                <RichTextEditor
                                    ref="rte"
                                    readOnly={loading}
                                    value={this.state.rte_value}
                                    onChange={this.onChange}
                                    onBlur={body.onBlur}
                                    tabIndex={2}
                                />
                            ) : (
                                <span>
                                    <Dropzone
                                        onDrop={this.onDrop}
                                        className={
                                            type === 'submit_story'
                                                ? 'dropzone'
                                                : 'none'
                                        }
                                        disableClick
                                        multiple
                                        accept="image/*"
                                        ref={node => {
                                            this.dropzone = node;
                                        }}
                                    >
                                        <textarea
                                            {...body.props}
                                            ref="postRef"
                                            onPasteCapture={this.onPasteCapture}
                                            className={
                                                type === 'submit_story'
                                                    ? 'upload-enabled'
                                                    : ''
                                            }
                                            disabled={loading}
                                            rows={isStory ? 10 : 3}
                                            placeholder={
                                                isStory
                                                    ? tt('g.write_your_story')
                                                    : tt('g.reply')
                                            }
                                            autoComplete="off"
                                            tabIndex={2}
                                        />
                                    </Dropzone>
                                    <p className="drag-and-drop">
                                        {tt(
                                            'reply_editor.insert_images_by_dragging_dropping'
                                        )}
                                        {noClipboardData
                                            ? ''
                                            : tt(
                                                  'reply_editor.pasting_from_the_clipboard'
                                              )}
                                        {tt('reply_editor.or_by')}{' '}
                                        <a onClick={this.onOpenClick}>
                                            {tt('reply_editor.selecting_them')}
                                        </a>.
                                    </p>
                                    {progress.message && (
                                        <div className="info">
                                            {progress.message}
                                        </div>
                                    )}
                                    {progress.error && (
                                        <div className="error">
                                            {tt('reply_editor.image_upload')} :{' '}
                                            {progress.error}
                                        </div>
                                    )}
                                </span>
                            )}
                        </div>

                        <div className={vframe_section_shrink_class}>
                            <div className="error">
                                {body.touched &&
                                    body.error &&
                                    body.error !== 'Required' &&
                                    body.error}
                            </div>
                        </div>

                        <div
                            className={vframe_section_shrink_class}
                            style={{ marginTop: '0.5rem' }}
                        >
                            {isStory && (
                                <span>
                                    <CategorySelector
                                        {...category.props}
                                        disabled={loading}
                                        isEdit={isEdit}
                                        tabIndex={3}
                                        trending={SCOT_TAGS}
                                    />
                                    <div className="error">
                                        {(category.touched || category.value) &&
                                            category.error}&nbsp;
                                    </div>
                                </span>
                            )}
                        </div>
                        <div className={vframe_section_shrink_class}>
                            {isStory &&
                                !isEdit && (
                                    <div className="ReplyEditor__options">
                                        <div>
                                            <div>
                                                {tt('g.rewards')}
                                                {': '}
                                                {this.props.payoutType ==
                                                    '0%' &&
                                                    tt(
                                                        'reply_editor.decline_payout'
                                                    )}
                                                {this.props.payoutType ==
                                                    '50%' &&
                                                    tt(
                                                        'reply_editor.default_50_50'
                                                    )}
                                                {this.props.payoutType ==
                                                    '100%' &&
                                                    tt(
                                                        'reply_editor.power_up_100'
                                                    )}
                                            </div>
                                            <div>
                                                {tt('g.app')}
                                                {': '}
                                                {this.props.appType ==
                                                    'steemcn/0.1' &&
                                                    tt(
                                                        'app_selections.steemcn'
                                                    )}
                                                {this.props.appType ==
                                                    'SteemitCryptoAcademy' &&
                                                    tt(
                                                        'app_selections.steemit_crypto_academy'
                                                    )}
                                                 {this.props.appType ==
                                                    'LifeStyle' &&
                                                    tt(
                                                        'app_selections.lifestyle'
                                                    )}
                                            </div>
                                            <a
                                                href="#"
                                                onClick={
                                                    this.showAdvancedSettings
                                                }
                                            >
                                                {tt(
                                                    'reply_editor.advanced_settings'
                                                )}
                                            </a>{' '}
                                            <br />
                                            &nbsp;
                                        </div>
                                    </div>
                                )}
                        </div>
                        <div className={vframe_section_shrink_class}>
                            {postError && (
                                <div className="error">{postError}</div>
                            )}
                        </div>
                        <div className={vframe_section_shrink_class}>
                            {!loading && (
                                <button
                                    type="submit"
                                    className="button"
                                    disabled={disabled}
                                    tabIndex={4}
                                >
                                    {isEdit
                                        ? tt('reply_editor.update_post')
                                        : postLabel}
                                </button>
                            )}
                            {loading && (
                                <span>
                                    <br />
                                    <LoadingIndicator type="circle" />
                                </span>
                            )}
                            &nbsp;{' '}
                            {!loading &&
                                this.props.onCancel && (
                                    <button
                                        type="button"
                                        className="secondary hollow button no-border"
                                        tabIndex={5}
                                        onClick={onCancel}
                                    >
                                        {tt('g.cancel')}
                                    </button>
                                )}
                            {!loading &&
                                !this.props.onCancel && (
                                    <button
                                        className="button hollow no-border"
                                        tabIndex={5}
                                        disabled={submitting}
                                        onClick={onCancel}
                                    >
                                        {tt('g.clear')}
                                    </button>
                                )}
                            {!isStory &&
                                !isEdit &&
                                this.props.payoutType != '50%' && (
                                    <div className="ReplyEditor__options float-right text-right">
                                        {tt('g.rewards')}
                                        {': '}
                                        {this.props.payoutType == '0%' &&
                                            tt('reply_editor.decline_payout')}
                                        {this.props.payoutType == '100%' &&
                                            tt('reply_editor.power_up_100')}
                                        {'. '}
                                        <a href={'/@' + username + '/settings'}>
                                            Update settings
                                        </a>
                                    </div>
                                )}
                        </div>
                    </form>
                    {!loading &&
                        !rte &&
                        body.value && (
                            <div
                                className={
                                    'Preview ' + vframe_section_shrink_class
                                }
                            >
                                {!isHtml && (
                                    <div className="float-right">
                                        <a
                                            target="_blank"
                                            href="https://guides.github.com/features/mastering-markdown/"
                                            rel="noopener noreferrer"
                                        >
                                            {tt(
                                                'reply_editor.markdown_styling_guide'
                                            )}
                                        </a>
                                    </div>
                                )}
                                <h6>{tt('g.preview')}</h6>
                                <MarkdownViewer
                                    text={body.value}
                                    jsonMetadata={jsonMetadata}
                                    large={isStory}
                                    noImage={noImage}
                                />
                            </div>
                        )}
                </div>
            </div>
        );
    }
}

let saveEditorTimeout;

// removes <html></html> wrapper if exists
function stripHtmlWrapper(text) {
    const m = text.match(/<html>\n*([\S\s]+?)?\n*<\/html>/m);
    return m && m.length === 2 ? m[1] : text;
}

// See also MarkdownViewer render
const isHtmlTest = text => /^<html>/.test(text);

function stateToHtml(state) {
    let html = state.toString('html');
    if (html === '<p></p>') html = '';
    if (html === '<p><br></p>') html = '';
    if (html == '') return '';
    return `<html>\n${html}\n</html>`;
}

function stateFromHtml(RichTextEditor, html = null) {
    if (!RichTextEditor) return null;
    if (html) html = stripHtmlWrapper(html);
    if (html && html.trim() == '') html = null;
    return html
        ? RichTextEditor.createValueFromString(html, 'html')
        : RichTextEditor.createEmptyValue();
}

function stateFromMarkdown(RichTextEditor, markdown) {
    let html;
    if (markdown && markdown.trim() !== '') {
        html = remarkable.render(markdown);
        html = HtmlReady(html).html; // TODO: option to disable youtube conversion, @-links, img proxy
        //html = htmlclean(html) // normalize whitespace
        console.log('markdown converted to:', html);
    }
    return stateFromHtml(RichTextEditor, html);
}

import { connect } from 'react-redux';
const richTextEditor = process.env.BROWSER
    ? require('react-rte-image').default
    : null;

export default formId =>
    connect(
        // mapStateToProps
        (state, ownProps) => {
            const username = state.user.getIn(['current', 'username']);
            const fields = ['body'];
            const { type, parent_author, jsonMetadata } = ownProps;
            const isEdit = type === 'edit';
            const isStory =
                /submit_story/.test(type) || (isEdit && parent_author === '');
            if (isStory) fields.push('title');
            if (isStory) fields.push('category');
            if (isStory) fields.push('thumbnail');

            let { category, title, body, thumbnail } = ownProps;
            if (/submit_/.test(type)) title = body = '';
            if (isStory && jsonMetadata && jsonMetadata.tags) {
                category = OrderedSet([category, ...jsonMetadata.tags]).join(
                    ' '
                );
            }
            if (isStory && jsonMetadata && jsonMetadata.image) {
                thumbnail = jsonMetadata.image[0];
            }

            const defaultPayoutType = state.app.getIn(
                [
                    'user_preferences',
                    isStory ? 'defaultBlogPayout' : 'defaultCommentPayout',
                ],
                '50%'
            );
            let payoutType = state.user.getIn([
                'current',
                'post',
                formId,
                'payoutType',
            ]);
            if (!payoutType) {
                payoutType = defaultPayoutType;
            }
            let appType = state.user.getIn([
                'current',
                'post',
                formId,
                'appType',
            ]);
            if (!appType) {
                appType = 'steemcn/0.1';
            }

            const ret = {
                ...ownProps,
                fields,
                isStory,
                username,
                defaultPayoutType,
                payoutType,
                appType,
                initialValues: { title, body, category, thumbnail },
                state,
                formId,
                richTextEditor,
            };
            return ret;
        },

        // mapDispatchToProps
        dispatch => ({
            clearMetaData: id => {
                dispatch(globalActions.clearMeta({ id }));
            },
            setMetaData: (id, jsonMetadata) => {
                dispatch(
                    globalActions.setMetaData({
                        id,
                        meta: jsonMetadata ? jsonMetadata.steem : null,
                    })
                );
            },
            uploadImage: (file, progress) =>
                dispatch(userActions.uploadImage({ file, progress })),
            showAdvancedSettings: formId =>
                dispatch(userActions.showPostAdvancedSettings({ formId })),
            setPayoutType: (formId, payoutType) =>
                dispatch(
                    userActions.set({
                        key: ['current', 'post', formId, 'payoutType'],
                        value: payoutType,
                    })
                ),
            setAppType: (formId, appType) =>
                dispatch(
                    userActions.set({
                        key: ['current', 'post', formId, 'appType'],
                        value: appType,
                    })
                ),
            reply: ({
                category,
                title,
                body,
                author,
                permlink,
                parent_author,
                parent_permlink,
                isHtml,
                isStory,
                type,
                originalPost,
                payoutType = '50%',
                appType = 'steemcn/0.1',
                state,
                jsonMetadata,
                successCallback,
                errorCallback,
                startLoadingIndicator,
                thumbnail,
            }) => {
                // const post = state.global.getIn(['content', author + '/' + permlink])
                const username = state.user.getIn(['current', 'username']);

                const isEdit = type === 'edit';
                const isNew = /^submit_/.test(type);
                let selection = appType;
                // Wire up the current and parent props for either an Edit or a Submit (new post)
                //'submit_story', 'submit_comment', 'edit'
                const linkProps = isNew
                    ? {
                          // submit new
                          parent_author: author,
                          parent_permlink: permlink,
                          author: username,
                          // permlink,  assigned in TransactionSaga
                      }
                    : // edit existing
                      isEdit
                      ? { author, permlink, parent_author, parent_permlink }
                      : null;

                if (!linkProps) throw new Error('Unknown type: ' + type);

                // If this is an HTML post, it MUST begin and end with the tag
                if (isHtml && !body.match(/^<html>[\s\S]*<\/html>$/)) {
                    errorCallback(
                        'HTML posts must begin with <html> and end with </html>'
                    );
                    return;
                }

                let rtags;
                {
                    const html = isHtml ? body : remarkable.render(body);
                    rtags = HtmlReady(html, { mutate: false });
                }

                allowedTags.forEach(tag => {
                    rtags.htmltags.delete(tag);
                });
                if (isHtml) rtags.htmltags.delete('html'); // html tag allowed only in HTML mode
                if (rtags.htmltags.size) {
                    errorCallback(
                        'Please remove the following HTML elements from your post: ' +
                            Array(...rtags.htmltags)
                                .map(tag => `<${tag}>`)
                                .join(', ')
                    );
                    return;
                }

                const formCategories = OrderedSet(
                    category
                        ? category
                              .trim()
                              .replace(/#/g, '')
                              .split(/ +/)
                        : []
                );
                let rootCategory = 'hive-180932';
                let allCategories = OrderedSet([...formCategories.toJS()]);

                let postHashtags = [...rtags.hashtags];
                while (
                    allCategories.size <
                    MAX_TAG - allCategories.includes(DEFAULT_TAGS)
                        ? 0
                        : 1 && postHashtags.length > 0
                ) {
                    allCategories = allCategories.add(postHashtags.shift());
                }
                if(appType =='SteemitCryptoAcademy'){
                    rootCategory = 'hive-108451';
                    appType="steemcn/0.1";
                }
                if(appType =='LifeStyle'){
                    rootCategory = 'hive-120412';
                    appType="steemcn/0.1";
                }

                if (appType == 'steemcn/0.1') {
                    selection = 'steemcn';
                }

                for (var i in DEFAULT_TAGS) {
                    allCategories = allCategories.add(DEFAULT_TAGS[i]);
                }
                if (isEdit) {
                    appType = 'steemcn/0.1';
                }
                // if (appType == 'busy/2.5.4' || appType == 'steemcn') {
                //     allCategories = allCategories.add('busy');
                // }
                if (!allCategories.includes('iv')) {
                    allCategories = allCategories.add('actnearn');
                }
                // merge
                const meta = isEdit ? jsonMetadata : {};
                if (isStory) {
                    if (allCategories.size) meta.tags = allCategories.toJS();
                    else delete meta.tags;
                }
                if (rtags.usertags.size) meta.users = rtags.usertags;
                else delete meta.users;
                if (thumbnail) {
                    meta.image = thumbnail;
                } else {
                    if (rtags.images.size) meta.image = rtags.images;
                    else delete meta.image;
                }
                if (rtags.links.size) meta.links = rtags.links;
                else delete meta.links;
                meta.app = appType;
                if (isStory) {
                    meta.format = isHtml ? 'html' : 'markdown';
                }

                // if(Object.keys(json_metadata.steem).length === 0) json_metadata = {}// keep json_metadata minimal
                const sanitizeErrors = [];
                sanitize(body, sanitizeConfig({ sanitizeErrors }));
                if (sanitizeErrors.length) {
                    errorCallback(sanitizeErrors.join('.  '));
                    return;
                }
                if (isStory) {
                    if (meta.tags.length > MAX_TAG) {
                        const includingCategory = isEdit
                            ? tt('reply_editor.including_the_category', {
                                  rootCategory,
                              })
                            : '';
                        errorCallback(
                            tt('reply_editor.use_limited_amount_of_tags', {
                                tagsLength: meta.tags.length,
                                includingCategory,
                            })
                        );
                        return;
                    }
                }

                startLoadingIndicator();

                const originalBody = isEdit ? originalPost.body : null;
                const __config = { originalBody };
                // Avoid changing payout option during edits #735
                if (!isEdit && isStory) {
                    switch (payoutType) {
                        case '0%': // decline payout
                            __config.comment_options = {
                                max_accepted_payout: '0.000 SBD',
                            };
                            break;
                        case '100%': // 100% steem power payout
                            __config.comment_options = {
                                percent_steem_dollars: 0, // 10000 === 100% (of 50%)
                            };
                            break;
                        default: // 50% steem power, 50% sd+steem
                    }
                    if (!__config.comment_options) {
                        __config.comment_options = {};
                    }
                    switch (selection) {
                        case 'steemcn':
                            __config.comment_options.extensions = [
                                [
                                    0,
                                    {
                                        beneficiaries: [
                                            {
                                                account: 'steem-drivers',
                                                weight: 100,
                                            },
                                        ],
                                    },
                                ],
                            ];
                            break;
                        default:
                    }
                }

                const operation = {
                    ...linkProps,
                    category: rootCategory,
                    title,
                    body,
                    json_metadata: meta,
                    __config,
                };
                dispatch(
                    transactionActions.broadcastOperation({
                        type: 'comment',
                        operation,
                        errorCallback,
                        successCallback,
                    })
                );
            },
        })
    )(ReplyEditor);
